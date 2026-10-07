"""Knife detection with per-view persistence, ported from the model team's
weapondetection.py.

Split in two so the alarm rules can be tested without a model:
  WeaponDetector  - one batched yolov8n pass over all views (I/O, model)
  KnifeConfirmer  - pure streak/bypass/cooldown logic

Confirmation rules (model team's tested defaults, see config.py):
  * a knife candidate needs confidence > knife_alarm_confidence
  * it must appear in knife_consecutive_required consecutive frames in the
    SAME view, unless confidence >= knife_high_conf_bypass
  * confirmed detections fire at most once per weapon_alarm_cooldown_seconds,
    across all views
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from ultralytics import YOLO

from app.config import settings
from app.pipeline.device import resolve_device

BBox = tuple[int, int, int, int]  # (x1, y1, x2, y2) in view pixel coordinates

# COCO class names this stage reports; everything else yolov8n sees is
# discarded. Persons are kept for the overlay, knives drive the alarm.
WEAPON_LABELS = ("person", "knife")
WeaponLabel = Literal["person", "knife"]


@dataclass(frozen=True)
class ViewDetection:
    view: str
    label: WeaponLabel
    confidence: float
    bbox: BBox


@dataclass(frozen=True)
class KnifeCandidate:
    confidence: float
    bbox: BBox


@dataclass(frozen=True)
class KnifeObservation:
    """One view's knife reading for one frame. Mirrors a knife_log.csv row."""

    view: str
    confidence: float
    bbox: BBox
    streak: int
    confirmed: bool
    # "high-confidence bypass", "<n>-frame persistence", or "" if unconfirmed
    confirmation_method: str
    alarm_fired: bool


class WeaponDetector:
    def __init__(self, model_path: str = settings.weapon_model_path, device: str = settings.weapon_device):
        self._model = YOLO(model_path)
        self.device = resolve_device(device)
        self._class_ids = [
            class_id for class_id, name in self._model.names.items() if name in WEAPON_LABELS
        ]

    def detect(self, views: dict[str, np.ndarray]) -> dict[str, list[ViewDetection]]:
        """Runs a single batched inference across all views. Pass clean
        (unannotated) views — boxes drawn on an input would be seen by YOLO.
        """
        names = list(views)
        results = self._model.predict(
            [views[name] for name in names],
            classes=self._class_ids,
            conf=settings.weapon_display_confidence,
            imgsz=settings.detect_input_size,
            device=self.device,
            verbose=False,
        )

        detections: dict[str, list[ViewDetection]] = {name: [] for name in names}
        for name, result in zip(names, results):
            boxes = result.boxes
            if boxes is None:
                continue
            for i in range(len(boxes)):
                x1, y1, x2, y2 = (int(v) for v in boxes.xyxy[i].tolist())
                detections[name].append(
                    ViewDetection(
                        view=name,
                        label=self._model.names[int(boxes.cls[i])],
                        confidence=float(boxes.conf[i]),
                        bbox=(x1, y1, x2, y2),
                    )
                )
        return detections


def best_knife_per_view(
    detections: dict[str, list[ViewDetection]],
    min_confidence: float = settings.knife_alarm_confidence,
) -> dict[str, KnifeCandidate | None]:
    """Highest-confidence knife above the alarm threshold in each view."""
    best: dict[str, KnifeCandidate | None] = {}
    for view, view_detections in detections.items():
        knives = [d for d in view_detections if d.label == "knife" and d.confidence > min_confidence]
        top = max(knives, key=lambda d: d.confidence, default=None)
        best[view] = KnifeCandidate(top.confidence, top.bbox) if top else None
    return best


class KnifeConfirmer:
    """Per-view knife streaks + global alarm cooldown. Holds no model and
    does no I/O, so a caller decides what a fired alarm means (event, crop,
    snapshot).
    """

    def __init__(
        self,
        consecutive_required: int = settings.knife_consecutive_required,
        high_conf_bypass: float = settings.knife_high_conf_bypass,
        cooldown_seconds: float = settings.weapon_alarm_cooldown_seconds,
    ):
        self.consecutive_required = consecutive_required
        self.high_conf_bypass = high_conf_bypass
        self.cooldown_seconds = cooldown_seconds
        self.streaks: dict[str, int] = {}
        self._last_alarm_at: float | None = None

    def update(self, candidates: dict[str, KnifeCandidate | None], now: float) -> list[KnifeObservation]:
        """Feed one frame's best knife per view (None = no knife in that view).
        Returns an observation for every view that had a candidate; at most
        one per call has alarm_fired=True because the cooldown is shared.
        """
        observations: list[KnifeObservation] = []

        for view, candidate in candidates.items():
            if candidate is None:
                self.streaks[view] = 0
                continue

            streak = self.streaks.get(view, 0) + 1
            self.streaks[view] = streak

            bypass = candidate.confidence >= self.high_conf_bypass
            persisted = streak >= self.consecutive_required
            confirmed = bypass or persisted
            if bypass:
                method = "high-confidence bypass"
            elif persisted:
                method = f"{streak}-frame persistence"
            else:
                method = ""

            cooled_down = self._last_alarm_at is None or now - self._last_alarm_at > self.cooldown_seconds
            alarm_fired = confirmed and cooled_down
            if alarm_fired:
                self._last_alarm_at = now

            observations.append(
                KnifeObservation(
                    view=view,
                    confidence=candidate.confidence,
                    bbox=candidate.bbox,
                    streak=streak,
                    confirmed=confirmed,
                    confirmation_method=method,
                    alarm_fired=alarm_fired,
                )
            )

        return observations


def crop_with_padding(image: np.ndarray, bbox: BBox, padding: float = settings.knife_crop_padding) -> np.ndarray | None:
    """Evidence close-up of a detection, padded by `padding` x box size on
    each side and clamped to the image. Crop from the RAW view so the
    evidence has no overlay boxes drawn on it. None if the box is degenerate.
    """
    x1, y1, x2, y2 = bbox
    height, width = image.shape[:2]
    pad_x = int((x2 - x1) * padding)
    pad_y = int((y2 - y1) * padding)

    cx1, cy1 = max(0, x1 - pad_x), max(0, y1 - pad_y)
    cx2, cy2 = min(width, x2 + pad_x), min(height, y2 + pad_y)
    if cx2 <= cx1 or cy2 <= cy1:
        return None
    return image[cy1:cy2, cx1:cx2].copy()
