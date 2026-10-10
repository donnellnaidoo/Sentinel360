"""ALPR: plate normalisation, watchlist matching, confirmation and the
privacy rule (non-matching plates are never kept) — no models needed,
except the last test, which reads a synthetic plate with the real models
when they're already cached."""

from pathlib import Path

import cv2
import numpy as np
import pytest

from app.pipeline.capture import Frame
from app.pipeline.events import DetectionEvent
from app.pipeline.pipeline import FrameProcessor
from app.pipeline.plates import (
    PlateConfirmer,
    PlateRead,
    PlateReader,
    PlateWatchlist,
    WantedPlate,
    normalize_plate,
    plate_key,
)
from app.pipeline.weapon import ViewDetection

WANTED = {plate_key("CA 123-456"): WantedPlate("v1", "Getaway car", "HIGH", "CA 123-456")}


def _read(text: str, confidence: float = 0.95, view: str = "Main") -> PlateRead:
    return PlateRead(view, normalize_plate(text), confidence, (10, 10, 60, 30))


def test_normalise_and_compare_plates():
    assert normalize_plate("ca 123-456") == "CA123456"
    assert normalize_plate("ABC 123 GP") == "ABC123GP"
    # Look-alike characters compare equal; different plates don't.
    assert plate_key("CA 1O3-456") == plate_key("CA103456")
    assert plate_key("GP 8BS") == plate_key("6P 885")
    assert plate_key("CA 123-456") != plate_key("CA 123-457")


def test_needs_two_reads_then_fires_once_per_cooldown():
    confirmer = PlateConfirmer(min_confidence=0.7, reads_required=2, window_seconds=10, cooldown_seconds=300)
    assert confirmer.update(0.0, [_read("CA 123 456")], WANTED) == []
    (match,) = confirmer.update(0.4, [_read("CA123456")], WANTED)
    assert match.wanted.entity_profile_id == "v1" and match.reads == 2
    assert match.describe() == {
        "entityProfileId": "v1",
        "displayName": "Getaway car",
        "priorityLevel": "HIGH",
        "similarity": 0.95,
        "plate": "CA 123-456",
    }
    assert confirmer.update(1.0, [_read("CA123456")], WANTED) == []  # cooldown
    assert len(confirmer.update(301.0, [_read("CA123456"), _read("CA123456")], WANTED)) == 1


def test_reads_too_far_apart_or_unsure_dont_count():
    confirmer = PlateConfirmer(min_confidence=0.7, reads_required=2, window_seconds=10, cooldown_seconds=300)
    confirmer.update(0.0, [_read("CA123456")], WANTED)
    assert confirmer.update(11.0, [_read("CA123456")], WANTED) == []  # first read expired
    assert confirmer.update(12.0, [_read("CA123456", confidence=0.5)], WANTED) == []  # too unsure


def test_plates_that_arent_wanted_are_not_kept():
    confirmer = PlateConfirmer(min_confidence=0.7, reads_required=1, window_seconds=10, cooldown_seconds=300)
    for t in range(5):
        assert confirmer.update(float(t), [_read("ND 999 111"), _read("XYZ 789 GP")], WANTED) == []
    # Nothing about those plates is held — only a count.
    assert confirmer._recent == {} and confirmer._last_alert == {}
    assert confirmer.reads_seen == 10


def test_watchlist_keeps_plates_and_survives_a_failed_fetch():
    items = [
        {"entityProfileId": "v1", "displayName": "Getaway car", "priorityLevel": "HIGH", "photoUrl": None, "plates": ["CA 123-456", "", "AB"]},
        {"entityProfileId": "p1", "displayName": "Face only", "photoUrl": "https://x/p1.jpg", "plates": []},
    ]
    watchlist = PlateWatchlist(lambda: items)
    watchlist.refresh()
    assert list(watchlist.plates) == [plate_key("CA 123-456")]

    def offline():
        raise OSError("down")

    watchlist._fetch = offline
    watchlist.refresh()
    assert list(watchlist.plates) == [plate_key("CA 123-456")]
    assert watchlist.status()["last_error"].startswith("fetch failed")


class _ScriptedReader(PlateReader):
    """Real read_views logic; read() returns a plate at (5,5)-(45,15) of
    whatever it's given and records the image sizes."""

    model_name = "test-alpr"

    def __init__(self, text: str = "CA123456"):
        self.text = text
        self.sizes: list[tuple[int, int]] = []

    def read(self, image):
        self.sizes.append(image.shape[:2])
        return [(self.text, 0.95, (5, 5, 45, 15))]


def test_reads_vehicle_crops_and_maps_boxes_back_to_the_view():
    reader = _ScriptedReader()
    view = np.zeros((360, 480, 3), np.uint8)
    reads = reader.read_views({"Front": view, "Rear": view}, {"Front": [(100, 100, 300, 250)]}, scan_full_view=False)
    (read,) = reads
    assert read.view == "Front" and read.vehicle_bbox == (100, 100, 300, 250)
    # Crop padded by 10% (20 px, 15 px): plate offset by the crop origin.
    assert read.bbox == (85, 90, 125, 100)
    assert reader.sizes == [(180, 240)]  # Rear (no vehicle) wasn't read

    full = _ScriptedReader().read_views({"Rear": view}, {}, scan_full_view=True)
    assert [r.view for r in full] == ["Rear"]


class _CarDetector:
    alarm_labels = ["knife"]
    model_name = "yolov8n-coco"
    extra_unavailable = None

    def detect(self, views):
        return {name: [ViewDetection(name, "car", 0.9, (100, 100, 300, 250))] for name in views}


class _StaticWatchlist:
    def __init__(self, plates):
        self.plates = plates


def _frame(i: int) -> Frame:
    return Frame(image=np.full((360, 480, 3), 90, np.uint8), frame_index=i, timestamp=i * 0.2)


def test_pipeline_raises_one_plate_match_for_review():
    events: list[DetectionEvent] = []
    processor = FrameProcessor(
        _CarDetector(),
        None,
        emit=events.append,
        camera_id="CAM-TEST",
        plate_reader=_ScriptedReader(),
        plate_watchlist=_StaticWatchlist(WANTED),
        alpr_every_frames=1,
    )
    for i in range(6):
        processor.process(_frame(i))

    (event,) = events
    assert event.event_type == "PLATE_MATCH"
    assert event.summary == "Possible plate match: CA 123-456 (Getaway car) — camera CAM-TEST (verify)"
    assert event.metadata["plateRead"] == "CA123456" and event.metadata["watchlistReview"] == "required"
    assert event.metadata["watchlistMatches"][0]["entityProfileId"] == "v1"
    assert event.crop_jpeg and event.snapshot_jpeg


def test_no_wanted_plates_means_no_plates_are_read():
    reader = _ScriptedReader()
    events: list[DetectionEvent] = []
    processor = FrameProcessor(
        _CarDetector(), None, emit=events.append, plate_reader=reader, plate_watchlist=_StaticWatchlist({}), alpr_every_frames=1
    )
    for i in range(4):
        processor.process(_frame(i))
    assert reader.sizes == [] and events == []


_CACHED = (Path.home() / ".cache" / "fast-plate-ocr" / "cct-xs-v2-global-model").is_dir() and (
    Path.home() / ".cache" / "open-image-models" / "yolo-v9-t-384-license-plate-end2end"
).is_dir()


@pytest.mark.skipif(not _CACHED, reason="ALPR models not downloaded (scripts/download_models.py)")
def test_real_models_read_a_south_african_plate():
    plate = np.full((55, 260, 3), 255, np.uint8)
    cv2.rectangle(plate, (1, 1), (258, 53), (0, 0, 0), 2)
    cv2.putText(plate, "CA 123-456", (14, 40), cv2.FONT_HERSHEY_DUPLEX, 1.3, (0, 0, 0), 3, cv2.LINE_AA)
    scene = np.full((480, 640, 3), 70, np.uint8)
    cv2.rectangle(scene, (120, 150), (520, 420), (40, 40, 140), -1)
    scene[330:385, 190:450] = plate

    reads = PlateReader().read(scene)
    assert [text for text, _, _ in reads] == ["CA123456"]
    assert reads[0][1] > 0.9
