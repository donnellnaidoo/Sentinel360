"""Licence plate recognition (ALPR) against the watchlist. OFF by default
(settings.alpr_enabled).

fast-alpr (MIT, ONNX, CPU-friendly) finds plates and reads them. It runs
only on vehicles the weapon model already found (cars, bikes, buses,
trucks), every alpr_every_frames frames, so it costs little.

POPIA: a plate number is personal information. A reading that doesn't match
a watchlisted plate is discarded on the spot — never stored, logged or sent.
A match must be read alpr_reads_required times within
alpr_confirm_window_seconds (one misread can't raise an alert), and is
then only a suggestion for an officer to verify (PLATE_MATCH, with
watchlistReview = "required").

Split like the other stages:
  PlateReader     - the fast-alpr models (I/O)
  PlateWatchlist  - wanted plates from the backend, refreshed in background
  PlateConfirmer  - pure matching / persistence / cooldown, no model
"""

from __future__ import annotations

import collections
import logging
import re
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

BBox = tuple[int, int, int, int]

# COCO classes worth reading plates on.
VEHICLE_LABELS = ("car", "motorcycle", "bus", "truck")
# Shorter readings are too easy to match by accident.
MIN_PLATE_LENGTH = 4

# OCR mixes these up, so they compare as equal: a watchlisted "CA 1O3-456"
# typed with a letter O still matches a reading of "CA103456".
_CONFUSABLE = str.maketrans({"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8", "G": "6"})


def normalize_plate(text: str) -> str:
    """Upper case, letters and digits only: "ca 123-456" -> "CA123456"."""
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def plate_key(text: str) -> str:
    """What two plates are compared by: normalised, with look-alike
    characters folded together."""
    return normalize_plate(text).translate(_CONFUSABLE)


@dataclass(frozen=True)
class PlateRead:
    view: str
    text: str  # normalised, as read
    confidence: float  # mean per-character OCR confidence
    bbox: BBox  # plate, in view pixels
    vehicle_bbox: BBox | None = None


@dataclass(frozen=True)
class WantedPlate:
    entity_profile_id: str
    display_name: str | None
    priority_level: str | None
    plate: str  # as entered on the profile


@dataclass(frozen=True)
class PlateMatch:
    read: PlateRead
    wanted: WantedPlate
    reads: int  # matching reads within the confirmation window

    def describe(self) -> dict[str, Any]:
        """The watchlistMatches entry (same shape as face matches; the
        backend records it as an entity_match suggestion)."""
        return {
            "entityProfileId": self.wanted.entity_profile_id,
            "displayName": self.wanted.display_name,
            "priorityLevel": self.wanted.priority_level,
            "similarity": round(self.read.confidence, 4),
            "plate": self.wanted.plate,
        }


class PlateConfirmer:
    """Matches readings against the wanted plates. Non-matching readings
    are dropped immediately (nothing about them is kept). A wanted plate
    fires once it has been read `reads_required` times within
    `window_seconds`, then not again for `cooldown_seconds`."""

    def __init__(
        self,
        min_confidence: float = settings.alpr_min_confidence,
        reads_required: int = settings.alpr_reads_required,
        window_seconds: float = settings.alpr_confirm_window_seconds,
        cooldown_seconds: float = settings.alpr_match_cooldown_seconds,
    ):
        self.min_confidence = min_confidence
        self.reads_required = reads_required
        self.window_seconds = window_seconds
        self.cooldown_seconds = cooldown_seconds
        # Only ever holds wanted plates' keys.
        self._recent: dict[str, collections.deque[float]] = {}
        self._last_alert: dict[str, float] = {}
        self.reads_seen = 0

    def update(self, now: float, reads: list[PlateRead], wanted: dict[str, WantedPlate]) -> list[PlateMatch]:
        fired: list[PlateMatch] = []
        for read in reads:
            self.reads_seen += 1
            if read.confidence < self.min_confidence or len(read.text) < MIN_PLATE_LENGTH:
                continue
            key = plate_key(read.text)
            target = wanted.get(key)
            if target is None:
                continue  # not wanted: discarded
            recent = self._recent.setdefault(key, collections.deque())
            recent.append(now)
            while recent and now - recent[0] > self.window_seconds:
                recent.popleft()
            last = self._last_alert.get(key)
            if len(recent) >= self.reads_required and (last is None or now - last >= self.cooldown_seconds):
                self._last_alert[key] = now
                fired.append(PlateMatch(read, target, len(recent)))
        return fired


class PlateReader:
    def __init__(
        self,
        detector_model: str = settings.alpr_detector_model,
        ocr_model: str = settings.alpr_ocr_model,
        detector_confidence: float = settings.alpr_detector_confidence,
    ):
        from fast_alpr import ALPR

        self._alpr = ALPR(
            detector_model=detector_model, ocr_model=ocr_model, detector_conf_thresh=detector_confidence
        )
        self.model_name = f"{detector_model}+{ocr_model}"

    def read(self, image: np.ndarray) -> list[tuple[str, float, BBox]]:
        """(normalised text, mean character confidence, plate box) per plate."""
        results = []
        for result in self._alpr.predict(image):
            if result.ocr is None or not result.ocr.text:
                continue
            conf = result.ocr.confidence
            confidence = float(np.mean(conf)) if isinstance(conf, (list, tuple, np.ndarray)) else float(conf)
            box = result.detection.bounding_box
            results.append((normalize_plate(result.ocr.text), confidence, (box.x1, box.y1, box.x2, box.y2)))
        return results

    def read_views(
        self,
        views: dict[str, np.ndarray],
        vehicles: dict[str, list[BBox]],
        *,
        scan_full_view: bool = settings.alpr_scan_full_view,
        max_vehicles: int = settings.alpr_max_vehicles_per_view,
        padding: float = 0.1,
    ) -> list[PlateRead]:
        """Reads plates on each view's largest vehicles (a vehicle crop
        gives the plate more pixels than the whole view), or on the whole
        view if it has no vehicles and scan_full_view is set."""
        reads: list[PlateRead] = []
        for view, image in views.items():
            boxes = sorted(vehicles.get(view, []), key=lambda b: (b[2] - b[0]) * (b[3] - b[1]), reverse=True)
            if not boxes:
                if scan_full_view:
                    reads += [PlateRead(view, t, c, b) for t, c, b in self.read(image)]
                continue
            height, width = image.shape[:2]
            for x1, y1, x2, y2 in boxes[:max_vehicles]:
                pad_x, pad_y = int((x2 - x1) * padding), int((y2 - y1) * padding)
                cx1, cy1 = max(0, x1 - pad_x), max(0, y1 - pad_y)
                cx2, cy2 = min(width, x2 + pad_x), min(height, y2 + pad_y)
                if cx2 - cx1 < 16 or cy2 - cy1 < 16:
                    continue
                for text, confidence, (px1, py1, px2, py2) in self.read(image[cy1:cy2, cx1:cx2]):
                    reads.append(
                        PlateRead(
                            view, text, confidence, (px1 + cx1, py1 + cy1, px2 + cx1, py2 + cy1), (x1, y1, x2, y2)
                        )
                    )
        return reads


class PlateWatchlist:
    """Wanted plates (entity_profile.knownPlateNumbers of active wanted
    persons/vehicles), keyed by plate_key, from GET /internal/ai/watchlist."""

    def __init__(self, fetch: Callable[[], list[dict[str, Any]]], refresh_seconds: float = settings.watchlist_refresh_seconds):
        self._fetch = fetch
        self.refresh_seconds = refresh_seconds
        self.plates: dict[str, WantedPlate] = {}
        self.last_refresh: float | None = None
        self.last_error: str | None = None
        self._stop_event = threading.Event()

    def refresh(self) -> None:
        try:
            items = self._fetch()
        except Exception as exc:  # noqa: BLE001 — keep the previous list
            logger.warning("Could not fetch watchlist plates: %s", exc)
            self.last_error = f"fetch failed: {exc}"
            return
        plates: dict[str, WantedPlate] = {}
        for item in items:
            for plate in item.get("plates") or []:
                if not isinstance(plate, str) or len(normalize_plate(plate)) < MIN_PLATE_LENGTH:
                    continue
                plates[plate_key(plate)] = WantedPlate(
                    item["entityProfileId"], item.get("displayName"), item.get("priorityLevel"), plate
                )
        self.plates = plates
        self.last_refresh = time.time()
        self.last_error = None

    def start(self) -> None:
        def loop() -> None:
            while not self._stop_event.is_set():
                self.refresh()
                self._stop_event.wait(self.refresh_seconds)

        threading.Thread(target=loop, name="plate-watchlist-refresh", daemon=True).start()

    def close(self) -> None:
        self._stop_event.set()

    def status(self) -> dict[str, Any]:
        return {"plates": len(self.plates), "last_refresh": self.last_refresh, "last_error": self.last_error}


def load_alpr() -> tuple[PlateReader | None, PlateWatchlist | None, str | None]:
    """(reader, watchlist, None) or (None, None, reason). The watchlist's
    refresh is already started."""
    if not settings.alpr_enabled:
        return None, None, "disabled by ALPR_ENABLED"
    try:
        reader = PlateReader()
    except Exception as exc:  # noqa: BLE001 — a missing model shouldn't stop the pipeline
        logger.exception("Failed to load the ALPR models — plate matching disabled")
        return None, None, f"failed to load: {exc}"
    from app.pipeline.watchlist import fetch_watchlist

    watchlist = PlateWatchlist(fetch_watchlist)
    watchlist.start()
    return reader, watchlist, None
