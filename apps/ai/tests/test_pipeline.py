"""FrameProcessor wiring with fake detectors: confirmed detections become
events with evidence, and overlays never leak into the clean inputs.
"""

import numpy as np

from app.pipeline.anomaly import AnomalyResult
from app.pipeline.capture import Frame
from app.pipeline.events import DetectionEvent
from app.pipeline.pipeline import FrameProcessor
from app.pipeline.weapon import ViewDetection

KNIFE_BOX = (100, 100, 160, 140)


class FakeWeaponDetector:
    """Reports a knife in `knife_view` on every frame and records what it saw."""

    def __init__(self, knife_view: str | None, confidence: float = 0.6):
        self.knife_view = knife_view
        self.confidence = confidence
        self.seen: list[dict[str, np.ndarray]] = []

    def detect(self, views):
        self.seen.append({name: image.copy() for name, image in views.items()})
        return {
            name: (
                [ViewDetection(name, "knife", self.confidence, KNIFE_BOX)] if name == self.knife_view else []
            )
            for name in views
        }


class FakeAnomalyDetector:
    """Returns the scripted probabilities one per update(), like fresh
    background results, and records the clip frames it was given."""

    device = "cpu"
    last_error = None

    def __init__(self, probabilities: list[float]):
        self._probabilities = list(probabilities)
        self.last_result = None
        self.frames: list[np.ndarray] = []

    def update(self, frame):
        self.frames.append(frame)
        if not self._probabilities:
            return None
        self.last_result = AnomalyResult(self._probabilities.pop(0), 1)
        return self.last_result


def _panorama_frame(index: int) -> Frame:
    pano = np.full((480, 960, 3), 90, dtype=np.uint8)
    return Frame(image=pano, frame_index=index, timestamp=float(index) * 0.2, panoramic=True)


def _processor(weapon, anomaly=None) -> tuple[FrameProcessor, list[DetectionEvent]]:
    events: list[DetectionEvent] = []
    return FrameProcessor(weapon, anomaly, emit=events.append, camera_id="CAM-TEST"), events


def test_x3_knife_confirmed_after_three_frames_emits_one_event_with_evidence():
    processor, events = _processor(FakeWeaponDetector(knife_view="Rear"))

    displays = [processor.process(_panorama_frame(i)) for i in range(5)]

    assert displays[0].shape == (720, 960, 3)  # 2x2 grid of 480x360 views
    assert len(events) == 1  # 3rd frame confirms; 4th/5th are inside the 5s cooldown
    (event,) = events
    assert event.event_type == "WEAPON_DETECTED"
    assert event.camera_id == "CAM-TEST"
    assert event.metadata["view"] == "Rear"
    assert event.metadata["confirmationMethod"] == "3-frame persistence"
    assert event.metadata["bbox"] == list(KNIFE_BOX)
    assert event.snapshot_jpeg and event.snapshot_jpeg.startswith(b"\xff\xd8")
    assert event.crop_jpeg and event.crop_jpeg.startswith(b"\xff\xd8")


def test_detector_and_crop_see_clean_views():
    weapon = FakeWeaponDetector(knife_view="Rear")
    processor, events = _processor(weapon)
    for i in range(3):
        processor.process(_panorama_frame(i))

    # The flat-grey panorama has no box/label pixels unless an overlay leaked.
    for views in weapon.seen:
        for image in views.values():
            assert image.min() == image.max() == 90

    import cv2

    crop = cv2.imdecode(np.frombuffer(events[0].crop_jpeg, np.uint8), cv2.IMREAD_COLOR)
    assert abs(int(crop.mean()) - 90) <= 2


def test_anomaly_alarm_emits_once_with_experimental_flag_and_clean_composite():
    anomaly = FakeAnomalyDetector([0.7, 0.8, 0.9, 0.9])
    processor, events = _processor(FakeWeaponDetector(knife_view=None), anomaly)

    for i in range(4):
        processor.process(_panorama_frame(i))

    assert [e.event_type for e in events] == ["ANOMALY_DETECTED"]
    assert events[0].metadata["modelStatus"] == "experimental"
    assert events[0].crop_jpeg is None
    # 2x2 composite of 224x224 cells, built from clean views
    assert anomaly.frames[0].shape == (448, 448, 3)
    assert anomaly.frames[0].min() == anomaly.frames[0].max() == 90


def test_single_view_source_has_no_view_name_in_summary():
    processor, events = _processor(FakeWeaponDetector(knife_view="Main", confidence=0.9))
    frame = Frame(image=np.full((480, 640, 3), 90, dtype=np.uint8), frame_index=0, timestamp=0.0)

    display = processor.process(frame)

    assert display.shape == (480, 640, 3)
    assert events[0].summary == "Knife detected — camera CAM-TEST"
    assert events[0].metadata["confirmationMethod"] == "high-confidence bypass"
    assert frame.image.min() == frame.image.max() == 90  # raw frame untouched
