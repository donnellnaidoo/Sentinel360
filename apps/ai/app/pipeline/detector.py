"""Person/vehicle detection + tracking via a single YOLO11 model.

Ultralytics' `model.track(..., persist=True)` gives ByteTrack-based
persistent IDs for free when called frame-by-frame with the same model
instance — no separate ByteTrack integration needed.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from ultralytics import YOLO

from app.config import settings

# COCO class ids this pipeline cares about. Anything else YOLO11n detects
# (chair, bottle, ...) is discarded — irrelevant to a CCTV crime pipeline
# and would just cost CPU time drawing/tracking it.
PERSON_CLASS_ID = 0
VEHICLE_CLASS_IDS = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

DetectionClass = Literal["person", "vehicle"]


@dataclass
class Detection:
    track_id: int | None
    detection_class: DetectionClass
    label: str
    confidence: float
    # (x1, y1, x2, y2) in pixel coordinates of the input frame.
    bbox: tuple[int, int, int, int]


class PersonVehicleDetector:
    def __init__(self, model_path: str = settings.detector_model_path):
        # Ultralytics falls back to downloading the model by name if
        # model_path doesn't exist locally — fine for first-run dev, but the
        # README pre-fetches it so a live demo doesn't stall on a download.
        self._model = YOLO(model_path)
        self._class_ids = [PERSON_CLASS_ID, *VEHICLE_CLASS_IDS.keys()]

    def track(self, image: np.ndarray) -> list[Detection]:
        results = self._model.track(
            image,
            persist=True,
            tracker="bytetrack.yaml",
            classes=self._class_ids,
            conf=settings.detector_confidence,
            imgsz=settings.detect_input_size,
            verbose=False,
        )

        detections: list[Detection] = []
        if not results:
            return detections

        boxes = results[0].boxes
        if boxes is None:
            return detections

        track_ids = boxes.id
        for i in range(len(boxes)):
            cls_id = int(boxes.cls[i])
            confidence = float(boxes.conf[i])
            x1, y1, x2, y2 = (int(v) for v in boxes.xyxy[i].tolist())
            track_id = int(track_ids[i]) if track_ids is not None else None

            if cls_id == PERSON_CLASS_ID:
                detection_class: DetectionClass = "person"
                label = "person"
            else:
                detection_class = "vehicle"
                label = VEHICLE_CLASS_IDS.get(cls_id, "vehicle")

            detections.append(
                Detection(
                    track_id=track_id,
                    detection_class=detection_class,
                    label=label,
                    confidence=confidence,
                    bbox=(x1, y1, x2, y2),
                )
            )

        return detections
