"""Weapon (knife, and firearms with a fine-tuned model) detection with
per-view persistence, ported from the model team's weapondetection.py.

Split in two so the alarm rules can be tested without a model:
  WeaponDetector  - one batched YOLO pass over all views (I/O, model)
  KnifeConfirmer  - pure streak/bypass/cooldown logic

Confirmation rules (model team's tested defaults, see config.py):
  * a candidate needs confidence > knife_alarm_confidence
  * it must appear in knife_consecutive_required of the last
    knife_window_frames frames in the SAME view (by default 3 of 3, i.e.
    consecutive), unless confidence >= knife_high_conf_bypass
  * confirmed detections fire at most once per weapon_alarm_cooldown_seconds,
    across all views
  * optionally (weapon_require_person) only weapons near a person count

"Knife" in the names below predates firearm support; a candidate carries
its actual class in `label`.
"""

from __future__ import annotations

import collections
import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from ultralytics import YOLO

from app.config import settings
from app.pipeline.device import resolve_device

logger = logging.getLogger(__name__)

BBox = tuple[int, int, int, int]  # (x1, y1, x2, y2) in view pixel coordinates

PERSON_LABEL = "person"


@dataclass(frozen=True)
class ViewDetection:
    view: str
    label: str
    confidence: float
    bbox: BBox


@dataclass(frozen=True)
class KnifeCandidate:
    confidence: float
    bbox: BBox
    label: str = "knife"


@dataclass(frozen=True)
class KnifeObservation:
    """One view's weapon reading for one frame. Mirrors a knife_log.csv row."""

    view: str
    confidence: float
    bbox: BBox
    streak: int
    confirmed: bool
    # "high-confidence bypass", "<n>-frame persistence", "<k> of last <n>
    # frames", or "" if unconfirmed
    confirmation_method: str
    alarm_fired: bool
    label: str = "knife"


def model_name(model_path: str) -> str:
    """Name recorded on events, e.g. "yolov8n" or "weapon_yolo11n"."""
    stem = Path(model_path).stem
    return f"{stem}-coco" if stem in ("yolov8n", "yolo11n") else stem


class WeaponDetector:
    """Reports persons (for the overlay and the near-a-person rule) and the
    weapon_alarm_labels classes. A fine-tuned weapon model without a person
    class can be paired with a COCO model for persons
    (weapon_person_model_path), and a second ready-made model can add the
    classes the main one lacks (weapon_extra_model_path, e.g. guns). Labels
    from the extra model are lower-cased ("Gun" -> "gun").
    """

    def __init__(
        self,
        model_path: str = settings.weapon_model_path,
        device: str = settings.weapon_device,
        alarm_labels: list[str] | None = None,
        person_model_path: str = settings.weapon_person_model_path,
        extra_model_path: str = settings.weapon_extra_model_path,
        extra_labels: list[str] | None = None,
    ):
        self._model = YOLO(model_path)
        self.device = resolve_device(device)
        self.model_name = model_name(model_path)
        wanted = set(alarm_labels if alarm_labels is not None else settings.weapon_alarm_labels)
        names = self._model.names
        self.alarm_labels = sorted(name for name in names.values() if name in wanted)
        if not self.alarm_labels:
            raise ValueError(
                f"{model_path} has none of the alarm classes {sorted(wanted)} (it has: {sorted(names.values())})"
            )

        self._person_model = YOLO(person_model_path) if person_model_path else None
        keep = set(self.alarm_labels)
        if self._person_model is None:
            keep.add(PERSON_LABEL)
        self._class_ids = [class_id for class_id, name in names.items() if name in keep]
        self._person_class_ids = (
            [class_id for class_id, name in self._person_model.names.items() if name == PERSON_LABEL]
            if self._person_model is not None
            else []
        )

        self._extra_model: YOLO | None = None
        self._extra_class_ids: list[int] = []
        # Why the extra model isn't running (None when it is, or isn't configured).
        self.extra_unavailable: str | None = None
        if extra_model_path:
            self._load_extra(extra_model_path, extra_labels if extra_labels is not None else settings.weapon_extra_labels)

    def _load_extra(self, path: str, labels: list[str]) -> None:
        """A missing or unsuitable extra model is logged and skipped: the
        main model must keep working."""
        if not Path(path).is_file():
            self.extra_unavailable = f"{path} not found — run scripts/download_models.py"
            logger.warning("Extra weapon model %s", self.extra_unavailable)
            return
        try:
            model = YOLO(path)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to load extra weapon model %s", path)
            self.extra_unavailable = f"failed to load: {exc}"
            return
        class_ids = [class_id for class_id, name in model.names.items() if name in labels]
        if not class_ids:
            self.extra_unavailable = f"{path} has none of {labels} (it has: {sorted(model.names.values())})"
            logger.warning("Extra weapon model skipped: %s", self.extra_unavailable)
            return
        self._extra_model = model
        self._extra_class_ids = class_ids
        added = sorted({model.names[i].lower() for i in class_ids})
        self.alarm_labels = sorted(set(self.alarm_labels) | set(added))
        self.model_name = f"{self.model_name}+{Path(path).stem}"

    def _predict(self, model: YOLO, images: list[np.ndarray], class_ids: list[int]):
        return model.predict(
            images,
            classes=class_ids,
            conf=settings.weapon_display_confidence,
            imgsz=settings.detect_input_size,
            device=self.device,
            verbose=False,
        )

    def detect(self, views: dict[str, np.ndarray]) -> dict[str, list[ViewDetection]]:
        """Runs a single batched inference across all views. Pass clean
        (unannotated) views — boxes drawn on an input would be seen by YOLO.
        """
        names = list(views)
        images = [views[name] for name in names]
        detections: dict[str, list[ViewDetection]] = {name: [] for name in names}

        passes = [(self._model, self._predict(self._model, images, self._class_ids), False)]
        if self._person_model is not None:
            passes.append((self._person_model, self._predict(self._person_model, images, self._person_class_ids), False))
        if self._extra_model is not None:
            passes.append((self._extra_model, self._predict(self._extra_model, images, self._extra_class_ids), True))

        for model, results, lower in passes:
            for name, result in zip(names, results):
                boxes = result.boxes
                if boxes is None:
                    continue
                for i in range(len(boxes)):
                    x1, y1, x2, y2 = (int(v) for v in boxes.xyxy[i].tolist())
                    label = model.names[int(boxes.cls[i])]
                    detections[name].append(
                        ViewDetection(
                            view=name,
                            label=label.lower() if lower else label,
                            confidence=float(boxes.conf[i]),
                            bbox=(x1, y1, x2, y2),
                        )
                    )
        return detections


def near_person(weapon: BBox, persons: list[BBox], margin: float = settings.weapon_person_margin) -> bool:
    """True if the weapon box's centre lies inside some person box grown by
    `margin` x its width/height on each side — a held weapon is at the
    hand, which can be just outside the person box when the arm is out."""
    cx = (weapon[0] + weapon[2]) / 2
    cy = (weapon[1] + weapon[3]) / 2
    for x1, y1, x2, y2 in persons:
        pad_x = (x2 - x1) * margin
        pad_y = (y2 - y1) * margin
        if x1 - pad_x <= cx <= x2 + pad_x and y1 - pad_y <= cy <= y2 + pad_y:
            return True
    return False


def best_knife_per_view(
    detections: dict[str, list[ViewDetection]],
    min_confidence: float = settings.knife_alarm_confidence,
    *,
    alarm_labels: list[str] | tuple[str, ...] | None = None,
    require_person: bool = settings.weapon_require_person,
    person_margin: float = settings.weapon_person_margin,
) -> dict[str, KnifeCandidate | None]:
    """Highest-confidence weapon above the alarm threshold in each view
    (and, with require_person, near a person in that view)."""
    labels = set(alarm_labels if alarm_labels is not None else settings.weapon_alarm_labels)
    best: dict[str, KnifeCandidate | None] = {}
    for view, view_detections in detections.items():
        weapons = [d for d in view_detections if d.label in labels and d.confidence > min_confidence]
        if require_person:
            persons = [d.bbox for d in view_detections if d.label == PERSON_LABEL]
            weapons = [d for d in weapons if near_person(d.bbox, persons, person_margin)]
        top = max(weapons, key=lambda d: d.confidence, default=None)
        best[view] = KnifeCandidate(top.confidence, top.bbox, top.label) if top else None
    return best


class KnifeConfirmer:
    """Per-view streaks + global alarm cooldown. Holds no model and does no
    I/O, so a caller decides what a fired alarm means (event, crop,
    snapshot).
    """

    def __init__(
        self,
        consecutive_required: int = settings.knife_consecutive_required,
        high_conf_bypass: float = settings.knife_high_conf_bypass,
        cooldown_seconds: float = settings.weapon_alarm_cooldown_seconds,
        window_frames: int = settings.knife_window_frames,
    ):
        self.consecutive_required = consecutive_required
        self.high_conf_bypass = high_conf_bypass
        self.cooldown_seconds = cooldown_seconds
        self.window_frames = max(window_frames, consecutive_required)
        # Consecutive frames with a candidate, per view.
        self.streaks: dict[str, int] = {}
        # Hit/miss for the last window_frames frames, per view.
        self._recent: dict[str, collections.deque[bool]] = {}
        self._last_alarm_at: float | None = None

    def update(self, candidates: dict[str, KnifeCandidate | None], now: float) -> list[KnifeObservation]:
        """Feed one frame's best weapon per view (None = none in that view).
        Returns an observation for every view that had a candidate; at most
        one per call has alarm_fired=True because the cooldown is shared.
        """
        observations: list[KnifeObservation] = []

        for view, candidate in candidates.items():
            recent = self._recent.setdefault(view, collections.deque(maxlen=self.window_frames))
            recent.append(candidate is not None)
            if candidate is None:
                self.streaks[view] = 0
                continue

            streak = self.streaks.get(view, 0) + 1
            self.streaks[view] = streak
            hits = sum(recent)

            bypass = candidate.confidence >= self.high_conf_bypass
            # With window == required this is exactly "required consecutive".
            persisted = hits >= self.consecutive_required
            confirmed = bypass or persisted
            if bypass:
                method = "high-confidence bypass"
            elif streak >= self.consecutive_required:
                method = f"{streak}-frame persistence"
            elif persisted:
                method = f"{hits} of last {self.window_frames} frames"
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
                    label=candidate.label,
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
