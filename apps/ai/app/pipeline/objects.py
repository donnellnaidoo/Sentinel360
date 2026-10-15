"""Close-ups of everything the detector found in the alarm frame, attached
to the docket as evidence: "Knife 1", "Gun 1", "Person 1", "Person 2", ...

Uses the detections the frame already has (no extra inference). Weapons
need the alarm confidence; people are kept largest first, capped, and
include bystanders (see apps/ai/README.md). Vehicles and plates are not
cropped here: plate readings stay limited to watchlist matches (plates.py).
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.config import settings
from app.pipeline.weapon import PERSON_LABEL, BBox, ViewDetection, crop_with_padding


@dataclass(frozen=True)
class ObjectCrop:
    label: str  # detector class, e.g. "person", "knife", "gun"
    number: int  # 1-based within its label: Person 1, Person 2, ...
    view: str
    confidence: float
    bbox: BBox
    jpeg: bytes

    @property
    def name(self) -> str:
        return f"{self.label.capitalize()} {self.number}"

    def describe(self) -> dict:
        return {
            "label": self.label,
            "number": self.number,
            "name": self.name,
            "view": self.view,
            "bbox": list(self.bbox),
            "confidence": round(self.confidence, 4),
        }


def _encode(image: np.ndarray, max_side: int, max_bytes: int) -> bytes | None:
    """JPEG no longer than max_side and no bigger than max_bytes (the
    backend rejects the whole event over one oversized image)."""
    longest = max(image.shape[:2])
    if longest > max_side:
        scale = max_side / longest
        image = cv2.resize(
            image,
            (max(1, int(image.shape[1] * scale)), max(1, int(image.shape[0] * scale))),
            interpolation=cv2.INTER_AREA,
        )
    while True:
        for quality in (85, 70, 55):
            ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
            if ok and len(buffer) <= max_bytes:
                return buffer.tobytes()
        if min(image.shape[:2]) < 32:
            return None
        image = cv2.resize(image, (image.shape[1] // 2, image.shape[0] // 2), interpolation=cv2.INTER_AREA)


def _area(bbox: BBox) -> int:
    return max(0, bbox[2] - bbox[0]) * max(0, bbox[3] - bbox[1])


def select_objects(
    detections: dict[str, list[ViewDetection]],
    weapon_labels: list[str] | tuple[str, ...],
    *,
    weapon_confidence: float = settings.knife_alarm_confidence,
    max_weapons: int = settings.object_max_weapons,
    person_confidence: float = settings.object_person_confidence,
    max_people: int = settings.object_max_people,
) -> list[ViewDetection]:
    """Weapons first (most confident first), then people (largest first)."""
    labels = set(weapon_labels)
    every = [d for dets in detections.values() for d in dets]
    weapons = sorted(
        (d for d in every if d.label in labels and d.confidence > weapon_confidence),
        key=lambda d: -d.confidence,
    )[:max_weapons]
    people = sorted(
        (d for d in every if d.label == PERSON_LABEL and d.confidence >= person_confidence),
        key=lambda d: -_area(d.bbox),
    )[:max_people]
    return weapons + people


def crop_objects(
    views: dict[str, np.ndarray],
    detections: dict[str, list[ViewDetection]],
    weapon_labels: list[str] | tuple[str, ...],
    *,
    padding: float = settings.object_crop_padding,
    max_side: int = settings.object_crop_max_side,
    max_bytes: int = settings.object_crop_max_bytes,
) -> list[ObjectCrop]:
    """Crops from the CLEAN views, numbered per label in selection order."""
    crops: list[ObjectCrop] = []
    counts: dict[str, int] = {}
    for det in select_objects(detections, weapon_labels):
        view = views.get(det.view)
        if view is None:
            continue
        image = crop_with_padding(view, det.bbox, padding)
        jpeg = None if image is None else _encode(image, max_side, max_bytes)
        if jpeg is None:
            continue
        counts[det.label] = counts.get(det.label, 0) + 1
        crops.append(ObjectCrop(det.label, counts[det.label], det.view, det.confidence, det.bbox, jpeg))
    return crops
