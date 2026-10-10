"""Watchlist face matching. OFF by default (settings.face_recognition_enabled).

SFace (OpenCV Zoo, pairs with the YuNet detector in faces.py) turns a face
into a 128-number embedding. The gallery is the wanted persons with a photo,
fetched from the backend (GET /internal/ai/watchlist) and refreshed in the
background; each photo's face is embedded once.

A match is only a suggestion: it's attached to the alert/evidence metadata
(watchlistMatches, watchlistReview = "required") for an officer to verify.
Nothing is decided automatically. Matching wanted persons' faces is
biometric processing under POPIA — keep this off where that isn't justified.
"""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import httpx
import numpy as np

from app.config import settings
from app.pipeline.faces import FaceCrop, FaceDetector

logger = logging.getLogger(__name__)

SFACE_MODEL_NAME = "sface-2021dec"
WATCHLIST_PATH = "/internal/ai/watchlist"
# SFace's input: an aligned 112x112 face.
SFACE_INPUT_SIZE = (112, 112)
MAX_MATCHES_PER_FACE = 3


class FaceEmbedder:
    def __init__(self, model_path: str = settings.face_recognition_model_path):
        if not Path(model_path).is_file():
            raise FileNotFoundError(f"{model_path} not found (see apps/ai/README.md)")
        self._recognizer = cv2.FaceRecognizerSF.create(model_path, "")

    def embed(self, image: np.ndarray, bbox: tuple[int, int, int, int], landmarks: np.ndarray | None) -> np.ndarray:
        """Unit-length embedding. With YuNet's landmarks the face is aligned
        first (what SFace expects); without them the box is just resized."""
        if landmarks is not None:
            face = self._recognizer.alignCrop(image, landmarks)
        else:
            x1, y1, x2, y2 = bbox
            face = cv2.resize(image[y1:y2, x1:x2], SFACE_INPUT_SIZE)
        feature = self._recognizer.feature(face).flatten().astype(np.float32)
        return feature / max(float(np.linalg.norm(feature)), 1e-9)


@dataclass(frozen=True)
class WatchlistPerson:
    entity_profile_id: str
    display_name: str | None
    priority_level: str | None
    embedding: np.ndarray


@dataclass(frozen=True)
class WatchlistMatch:
    entity_profile_id: str
    display_name: str | None
    priority_level: str | None
    similarity: float

    def describe(self) -> dict[str, Any]:
        return {
            "entityProfileId": self.entity_profile_id,
            "displayName": self.display_name,
            "priorityLevel": self.priority_level,
            "similarity": round(self.similarity, 4),
        }


def best_matches(
    embedding: np.ndarray,
    people: list[WatchlistPerson],
    threshold: float = settings.face_match_threshold,
    limit: int = MAX_MATCHES_PER_FACE,
) -> list[WatchlistMatch]:
    """Watchlisted people this face is similar to (cosine >= threshold),
    most similar first."""
    scored = [
        WatchlistMatch(p.entity_profile_id, p.display_name, p.priority_level, float(np.dot(embedding, p.embedding)))
        for p in people
    ]
    return sorted((m for m in scored if m.similarity >= threshold), key=lambda m: -m.similarity)[:limit]


def fetch_watchlist() -> list[dict[str, Any]]:
    response = httpx.get(
        f"{settings.backend_url.rstrip('/')}{WATCHLIST_PATH}",
        headers={"X-Internal-Api-Key": settings.backend_api_key},
        timeout=settings.publisher_timeout_seconds,
    )
    response.raise_for_status()
    return response.json()["items"]


def download_image(url: str) -> np.ndarray | None:
    response = httpx.get(url, timeout=15.0, follow_redirects=True)
    response.raise_for_status()
    return cv2.imdecode(np.frombuffer(response.content, np.uint8), cv2.IMREAD_COLOR)


class WatchlistMatcher:
    """The gallery plus matching. refresh() rebuilds the gallery (start()
    does it periodically on a background thread); a photo is only
    downloaded and embedded again when its URL changes."""

    def __init__(
        self,
        detector: FaceDetector,
        embedder: FaceEmbedder,
        *,
        fetch: Callable[[], list[dict[str, Any]]] = fetch_watchlist,
        download: Callable[[str], np.ndarray | None] = download_image,
        threshold: float = settings.face_match_threshold,
        refresh_seconds: float = settings.watchlist_refresh_seconds,
    ):
        self.detector = detector
        self.embedder = embedder
        self.threshold = threshold
        self.refresh_seconds = refresh_seconds
        self._fetch = fetch
        self._download = download
        self.people: list[WatchlistPerson] = []
        self.last_refresh: float | None = None
        self.last_error: str | None = None
        # (entity id, photo url) -> embedding, or None if the photo had no face.
        self._embeddings: dict[tuple[str, str], np.ndarray | None] = {}
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def _embed_photo(self, url: str) -> np.ndarray | None:
        image = self._download(url)
        if image is None:
            return None
        faces = self.detector.detect_with_landmarks(image)
        if not faces:
            return None
        _, bbox, landmarks = max(faces, key=lambda f: (f[1][2] - f[1][0]) * (f[1][3] - f[1][1]))
        return self.embedder.embed(image, bbox, landmarks)

    def refresh(self) -> None:
        try:
            items = self._fetch()
        except Exception as exc:  # noqa: BLE001 — keep the previous gallery
            logger.warning("Could not fetch the watchlist: %s", exc)
            self.last_error = f"fetch failed: {exc}"
            return

        people = []
        errors = []
        for item in items:
            key = (item["entityProfileId"], item["photoUrl"])
            if key not in self._embeddings:
                try:
                    self._embeddings[key] = self._embed_photo(item["photoUrl"])
                except Exception as exc:  # noqa: BLE001 — one bad photo mustn't drop the rest
                    logger.warning("Could not embed watchlist photo for %s: %s", key[0], exc)
                    errors.append(key[0])
                    continue
                if self._embeddings[key] is None:
                    logger.warning("No face found in the watchlist photo for %s", key[0])
            embedding = self._embeddings[key]
            if embedding is not None:
                people.append(
                    WatchlistPerson(key[0], item.get("displayName"), item.get("priorityLevel"), embedding)
                )

        self.people = people
        self.last_refresh = time.time()
        self.last_error = f"photo failed for {len(errors)} profile(s)" if errors else None

    def start(self) -> None:
        def loop() -> None:
            while not self._stop_event.is_set():
                self.refresh()
                self._stop_event.wait(self.refresh_seconds)

        self._thread = threading.Thread(target=loop, name="watchlist-refresh", daemon=True)
        self._thread.start()

    def close(self) -> None:
        self._stop_event.set()

    def match_crops(self, views: dict[str, np.ndarray], crops: list[FaceCrop]) -> list[list[WatchlistMatch]]:
        """Matches for each crop (same order); [] for a face that matches
        no one."""
        people = self.people
        if not people:
            return [[] for _ in crops]
        return [
            best_matches(self.embedder.embed(views[c.view], c.bbox, c.landmarks), people, self.threshold)
            for c in crops
        ]

    def status(self) -> dict[str, Any]:
        return {
            "people": len(self.people),
            "last_refresh": self.last_refresh,
            "last_error": self.last_error,
            "threshold": self.threshold,
        }


def load_watchlist_matcher(detector: FaceDetector | None) -> tuple[WatchlistMatcher | None, str | None]:
    """(matcher, None) or (None, reason). The matcher's gallery refresh is
    already started."""
    if not settings.face_recognition_enabled:
        return None, "disabled by FACE_RECOGNITION_ENABLED"
    if detector is None:
        return None, "needs face detection (FACE_ENABLED and the YuNet model)"
    try:
        matcher = WatchlistMatcher(detector, FaceEmbedder())
    except Exception as exc:  # noqa: BLE001 — a missing model shouldn't stop the pipeline
        logger.exception("Failed to load the face recognition model — watchlist matching disabled")
        return None, f"failed to load: {exc}"
    matcher.start()
    return matcher, None
