"""Face crops attached to a docket as evidence.

Runs only when an event fires (weapon, anomaly, panic), on the clean views
of that frame, so it costs nothing on ordinary frames. Detection only: the
crops are stored on the case for investigators to look at. Matching them
against wanted persons is a separate, opt-in stage (watchlist.py). Every face in every view is kept (largest first, capped), which
includes bystanders; see apps/ai/README.md.

YuNet (OpenCV Zoo, ~230 KB ONNX) runs on CPU through cv2.FaceDetectorYN.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

YUNET_MODEL_NAME = "yunet-2023mar"


@dataclass(frozen=True)
class FaceCrop:
    view: str
    confidence: float
    bbox: tuple[int, int, int, int]  # x1, y1, x2, y2 in view pixels
    jpeg: bytes
    # YuNet's raw row (box + 5 landmarks + score), for aligning the face
    # before recognition (watchlist.py).
    landmarks: np.ndarray | None = None


def _crop_face(image: np.ndarray, bbox: tuple[int, int, int, int], padding: float, max_side: int) -> np.ndarray:
    x1, y1, x2, y2 = bbox
    pad_x = int((x2 - x1) * padding)
    pad_y = int((y2 - y1) * padding)
    height, width = image.shape[:2]
    crop = image[max(0, y1 - pad_y) : min(height, y2 + pad_y), max(0, x1 - pad_x) : min(width, x2 + pad_x)]
    longest = max(crop.shape[:2])
    if longest > max_side:
        scale = max_side / longest
        crop = cv2.resize(crop, (max(1, int(crop.shape[1] * scale)), max(1, int(crop.shape[0] * scale))), interpolation=cv2.INTER_AREA)
    return crop


class FaceDetector:
    def __init__(
        self,
        model_path: str = settings.face_model_path,
        *,
        score_threshold: float = settings.face_confidence,
        min_size: int = settings.face_min_size,
    ):
        if not Path(model_path).is_file():
            raise FileNotFoundError(f"{model_path} not found (see apps/ai/README.md)")
        self.min_size = min_size
        # Input size is set per image in detect().
        self._detector = cv2.FaceDetectorYN.create(model_path, "", (320, 320), score_threshold, 0.3, 5000)

    def detect(self, image: np.ndarray) -> list[tuple[float, tuple[int, int, int, int]]]:
        """(confidence, bbox) per face, bbox clipped to the image."""
        return [(confidence, bbox) for confidence, bbox, _ in self.detect_with_landmarks(image)]

    def detect_with_landmarks(
        self, image: np.ndarray
    ) -> list[tuple[float, tuple[int, int, int, int], np.ndarray | None]]:
        """(confidence, bbox, YuNet row) per face."""
        height, width = image.shape[:2]
        self._detector.setInputSize((width, height))
        _, faces = self._detector.detect(image)
        if faces is None:
            return []
        results = []
        for face in faces:
            x, y, w, h = (int(round(v)) for v in face[:4])
            x1, y1 = max(0, x), max(0, y)
            x2, y2 = min(width, x + w), min(height, y + h)
            if min(x2 - x1, y2 - y1) < self.min_size:
                continue
            results.append((float(face[-1]), (x1, y1, x2, y2), face.copy()))
        return results

    def crops(
        self,
        views: dict[str, np.ndarray],
        *,
        max_faces: int = settings.face_max_per_event,
        padding: float = settings.face_crop_padding,
        max_side: int = settings.face_crop_max_side,
    ) -> list[FaceCrop]:
        """Largest faces across all views, up to max_faces. A view that
        fails is logged and skipped — losing a face must not lose the event."""
        found: list[tuple[int, str, float, tuple[int, int, int, int], np.ndarray | None]] = []
        for name, image in views.items():
            try:
                for confidence, bbox, landmarks in self.detect_with_landmarks(image):
                    area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
                    found.append((area, name, confidence, bbox, landmarks))
            except cv2.error:
                logger.exception("Face detection failed on %s view", name)

        found.sort(key=lambda item: item[0], reverse=True)
        crops = []
        for _, name, confidence, bbox, landmarks in found[:max_faces]:
            ok, buffer = cv2.imencode(
                ".jpg", _crop_face(views[name], bbox, padding, max_side), [cv2.IMWRITE_JPEG_QUALITY, 90]
            )
            if ok:
                crops.append(FaceCrop(name, confidence, bbox, buffer.tobytes(), landmarks))
        return crops


def load_face_detector() -> tuple[FaceDetector | None, str | None]:
    """(detector, None) or (None, reason) — events still go out without
    face crops rather than the pipeline failing to start."""
    if not settings.face_enabled:
        return None, "disabled by FACE_ENABLED"
    try:
        return FaceDetector(settings.face_model_path), None
    except Exception as exc:  # noqa: BLE001 — a missing model shouldn't stop weapon detection
        logger.exception("Failed to load face detector — events will have no face crops")
        return None, f"failed to load: {exc}"
