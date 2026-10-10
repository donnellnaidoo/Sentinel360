"""FrameProcessor wiring with fake detectors: confirmed detections become
events with evidence, and overlays never leak into the clean inputs.
"""

import numpy as np
import pytest

from app.pipeline.anomaly import AnomalyResult, clip_frame
from app.pipeline.capture import Frame
from app.pipeline.events import DetectionEvent
from app.pipeline.faces import FaceCrop
from app.pipeline.pipeline import FrameProcessor, _encode_panorama
from app.pipeline.weapon import ViewDetection

KNIFE_BOX = (100, 100, 160, 140)


class FakeWeaponDetector:
    """Reports a knife in `knife_view` on every frame and records what it saw."""

    alarm_labels = ["knife"]
    model_name = "yolov8n-coco"
    extra_unavailable = None

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
    background results, and records the views it was given."""

    device = "cpu"
    last_error = None

    def __init__(self, probabilities: list[float]):
        self._probabilities = list(probabilities)
        self.last_result = None
        self.seen: list[dict[str, np.ndarray]] = []
        self.times: list[float] = []

    def update(self, views, timestamp, people_views=None):
        self.seen.append({name: image.copy() for name, image in views.items()})
        self.times.append(timestamp)
        if not self._probabilities:
            return None
        self.last_result = AnomalyResult(self._probabilities.pop(0), 1)
        return self.last_result


def _panorama_frame(index: int) -> Frame:
    pano = np.full((480, 960, 3), 90, dtype=np.uint8)
    return Frame(image=pano, frame_index=index, timestamp=float(index) * 0.2, panoramic=True)


class FakeFaceDetector:
    """One face per view; records the views it was asked about."""

    def __init__(self):
        self.seen: list[dict[str, np.ndarray]] = []

    def crops(self, views):
        self.seen.append(views)
        return [FaceCrop(name, 0.9, (1, 2, 30, 40), f"face-{name}".encode()) for name in sorted(views)]


def _processor(weapon, anomaly=None, faces=None) -> tuple[FrameProcessor, list[DetectionEvent]]:
    events: list[DetectionEvent] = []
    return FrameProcessor(weapon, anomaly, emit=events.append, camera_id="CAM-TEST", face_detector=faces), events


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


def test_panoramic_event_carries_the_clean_360_frame_and_where_the_detection_is():
    processor, events = _processor(FakeWeaponDetector(knife_view="Right"))
    for i in range(3):
        processor.process(_panorama_frame(i))

    (event,) = events
    import cv2

    panorama = cv2.imdecode(np.frombuffer(event.panorama_jpeg, np.uint8), cv2.IMREAD_COLOR)
    assert panorama.shape == (480, 960, 3)
    assert abs(int(panorama.mean()) - 90) <= 2  # clean: no boxes or labels
    # KNIFE_BOX sits left of and above the Right view's centre (yaw 90).
    target = event.metadata["panoramaTarget"]
    assert 45 < target["yaw"] < 90 and target["pitch"] > 0


def test_single_view_source_has_no_panorama():
    processor, events = _processor(FakeWeaponDetector(knife_view="Main", confidence=0.9))
    processor.process(Frame(image=np.full((480, 640, 3), 90, dtype=np.uint8), frame_index=0, timestamp=0.0))
    assert events[0].panorama_jpeg is None
    assert "panoramaTarget" not in events[0].metadata


def test_panorama_is_shrunk_to_fit_the_byte_cap():
    noise = np.random.default_rng(0).integers(0, 256, (960, 1920, 3), dtype=np.uint8)
    encoded = _encode_panorama(noise, max_width=1920, max_bytes=200 * 1024)
    assert encoded is not None and len(encoded) <= 200 * 1024
    import cv2

    width = cv2.imdecode(np.frombuffer(encoded, np.uint8), cv2.IMREAD_COLOR).shape[1]
    assert width < 1920  # noise doesn't compress, so it had to be resized


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
    assert "view" not in events[0].metadata
    # Fed clean views; in composite mode they become a 2x2 of 224x224 cells
    assert sorted(anomaly.seen[0]) == ["Front", "Left", "Rear", "Right"]
    (composite,) = clip_frame(anomaly.seen[0], "composite").values()
    assert composite.shape == (448, 448, 3)
    assert composite.min() == composite.max() == 90
    assert anomaly.times == pytest.approx([0.0, 0.2, 0.4, 0.6])


def test_single_view_source_has_no_view_name_in_summary():
    processor, events = _processor(FakeWeaponDetector(knife_view="Main", confidence=0.9))
    frame = Frame(image=np.full((480, 640, 3), 90, dtype=np.uint8), frame_index=0, timestamp=0.0)

    display = processor.process(frame)

    assert display.shape == (480, 640, 3)
    assert events[0].summary == "Knife detected — camera CAM-TEST"
    assert events[0].metadata["confirmationMethod"] == "high-confidence bypass"
    assert frame.image.min() == frame.image.max() == 90  # raw frame untouched


def test_events_carry_faces_from_every_clean_view():
    faces = FakeFaceDetector()
    processor, events = _processor(FakeWeaponDetector(knife_view="Rear"), faces=faces)

    for i in range(3):
        processor.process(_panorama_frame(i))

    (event,) = events
    assert len(faces.seen) == 1  # only when an event fires
    assert sorted(faces.seen[0]) == ["Front", "Left", "Rear", "Right"]
    for image in faces.seen[0].values():
        assert image.min() == image.max() == 90  # no overlays
    assert event.face_jpegs == [b"face-Front", b"face-Left", b"face-Rear", b"face-Right"]
    first = event.metadata["faces"][0]
    assert {k: first[k] for k in ("view", "bbox", "confidence")} == {"view": "Front", "bbox": [1, 2, 30, 40], "confidence": 0.9}
    assert event.metadata["faceModel"] == "yunet-2023mar"
    # Top-left of the Front view: left of centre and above the horizon.
    assert first["panoramaDirection"]["yaw"] < 0 < first["panoramaDirection"]["pitch"]


def test_anomaly_event_carries_faces():
    processor, events = _processor(
        FakeWeaponDetector(knife_view=None), FakeAnomalyDetector([0.7, 0.8, 0.9]), faces=FakeFaceDetector()
    )
    for i in range(3):
        processor.process(_panorama_frame(i))

    assert [e.event_type for e in events] == ["ANOMALY_DETECTED"]
    assert len(events[0].face_jpegs) == 4


def test_no_face_detector_means_no_faces():
    processor, events = _processor(FakeWeaponDetector(knife_view="Rear"))
    for i in range(3):
        processor.process(_panorama_frame(i))
    assert events[0].face_jpegs == []
    assert "faces" not in events[0].metadata


# --- watchlist suggestions and pose alarms ----------------------------------

from app.pipeline.pose import PersonPose
from app.pipeline.watchlist import WatchlistMatch, WatchlistMatcher, best_matches, WatchlistPerson


class FakeWatchlist:
    """Matches the face in `match_view` to one wanted person."""

    def __init__(self, match_view: str = "Rear"):
        self.match_view = match_view
        self.people = ["someone"]

    def match_crops(self, views, crops):
        return [
            [WatchlistMatch("entity-1", "Wanted Person", "HIGH", 0.71)] if crop.view == self.match_view else []
            for crop in crops
        ]


def test_weapon_event_carries_watchlist_suggestions_for_review():
    processor = FrameProcessor(
        FakeWeaponDetector(knife_view="Rear"),
        None,
        emit=(events := []).append,
        camera_id="CAM-TEST",
        face_detector=FakeFaceDetector(),
        watchlist=FakeWatchlist(),
        watchlist_scan=False,
    )
    for i in range(3):
        processor.process(_panorama_frame(i))

    (event,) = events
    assert event.metadata["watchlistReview"] == "required"
    assert event.metadata["watchlistMatches"] == [
        {
            "entityProfileId": "entity-1",
            "displayName": "Wanted Person",
            "priorityLevel": "HIGH",
            "similarity": 0.71,
            "faceNumber": 3,  # Front, Left, Rear, Right
        }
    ]
    assert "watchlistMatches" in event.metadata["faces"][2]
    assert "watchlistMatches" not in event.metadata["faces"][0]


def test_no_watchlist_match_adds_nothing():
    processor = FrameProcessor(
        FakeWeaponDetector(knife_view="Rear"),
        None,
        emit=(events := []).append,
        face_detector=FakeFaceDetector(),
        watchlist=FakeWatchlist(match_view="Nowhere"),
        watchlist_scan=False,
    )
    for i in range(3):
        processor.process(_panorama_frame(i))
    assert "watchlistMatches" not in events[0].metadata


def test_scan_raises_one_watchlist_match_per_person_per_cooldown():
    processor = FrameProcessor(
        FakeWeaponDetector(knife_view=None),
        None,
        emit=(events := []).append,
        camera_id="CAM-TEST",
        face_detector=FakeFaceDetector(),
        watchlist=FakeWatchlist(),
        watchlist_scan=True,
        scan_every_frames=2,
        watchlist_cooldown_seconds=60,
    )
    for i in range(10):  # 2 s of frames; scans on frames 2, 4, ...
        processor.process(_panorama_frame(i))

    (event,) = events
    assert event.event_type == "WATCHLIST_MATCH"
    assert event.confidence == 0.71
    assert event.summary == "Possible match: Wanted Person in Rear view — camera CAM-TEST (verify)"
    assert event.face_jpegs == [b"face-Rear"]
    assert event.metadata["watchlistMatches"][0]["faceNumber"] == 1
    assert event.metadata["watchlistReview"] == "required"
    assert event.snapshot_jpeg and event.snapshot_jpeg.startswith(b"\xff\xd8")


def test_scan_needs_face_detection():
    processor = FrameProcessor(
        FakeWeaponDetector(knife_view=None), None, emit=lambda e: None, watchlist=FakeWatchlist(), watchlist_scan=True
    )
    assert processor.watchlist_scan is False


class FakePersonWeaponDetector(FakeWeaponDetector):
    """A person in the Front view on every frame, no weapons."""

    def detect(self, views):
        return {name: ([ViewDetection(name, "person", 0.9, (100, 0, 150, 200))] if name == "Front" else []) for name in views}


class FakePoseEstimator:
    """Two people close together; the left one's wrist swings back and forth."""

    model_name = "yolo11n-pose"

    def __init__(self):
        self.calls: list[list[str]] = []

    def estimate(self, views):
        self.calls.append(sorted(views))
        swing = len(self.calls) % 2 == 1
        keypoints = np.zeros((17, 3), dtype=np.float32)
        keypoints[9:11] = (240 if swing else 140, 80, 0.9)
        return {
            name: [PersonPose((100, 0, 150, 200), 0.9, keypoints), PersonPose((160, 0, 210, 200), 0.9, np.zeros((17, 3)))]
            for name in views
        }


def test_pose_strikes_become_one_altercation_event_and_only_people_views_are_analysed():
    pose = FakePoseEstimator()
    processor = FrameProcessor(
        FakePersonWeaponDetector(knife_view=None), None, emit=(events := []).append, camera_id="CAM-TEST", pose_estimator=pose
    )
    for i in range(8):
        processor.process(_panorama_frame(i))

    assert all(call == ["Front"] for call in pose.calls)
    (event,) = events
    assert event.event_type == "ALTERCATION"
    assert event.summary == "Possible fight in Front view — camera CAM-TEST"
    assert event.metadata["reason"] == "strike"
    assert event.metadata["modelStatus"] == "experimental"
    assert event.crop_jpeg and event.crop_jpeg.startswith(b"\xff\xd8")


def test_best_matches_threshold_and_order():
    def unit(*v):
        a = np.array(v, dtype=np.float32)
        return a / np.linalg.norm(a)

    people = [
        WatchlistPerson("a", "A", None, unit(1, 0)),
        WatchlistPerson("b", "B", None, unit(1, 1)),
        WatchlistPerson("c", "C", None, unit(0, 1)),
    ]
    matches = best_matches(unit(1, 0.2), people, threshold=0.5)
    assert [m.entity_profile_id for m in matches] == ["a", "b"]


def test_matcher_refresh_keeps_gallery_and_skips_bad_photos():
    class Detector:
        def detect_with_landmarks(self, image):
            return [(0.9, (0, 0, 10, 10), None)] if image.mean() > 0 else []

    class Embedder:
        def embed(self, image, bbox, landmarks):
            return np.array([1.0, 0.0], dtype=np.float32)

    photos = {"u1": np.ones((20, 20, 3), np.uint8), "u2": np.zeros((20, 20, 3), np.uint8)}
    items = [
        {"entityProfileId": "p1", "displayName": "One", "photoUrl": "u1"},
        {"entityProfileId": "p2", "displayName": "No face", "photoUrl": "u2"},
        {"entityProfileId": "p3", "displayName": "Broken", "photoUrl": "u3"},
    ]

    def download(url):
        if url == "u3":
            raise OSError("404")
        return photos[url]

    calls = []
    matcher = WatchlistMatcher(Detector(), Embedder(), fetch=lambda: items, download=lambda u: calls.append(u) or download(u))
    matcher.refresh()
    assert [p.entity_profile_id for p in matcher.people] == ["p1"]
    assert matcher.last_error == "photo failed for 1 profile(s)"

    matcher.refresh()  # p1/p2 cached; only the failed one is retried
    assert calls.count("u1") == 1 and calls.count("u3") == 2

    def offline():
        raise OSError("backend down")

    matcher._fetch = offline
    matcher.refresh()
    assert [p.entity_profile_id for p in matcher.people] == ["p1"]
    assert matcher.last_error.startswith("fetch failed")


def test_evidence_images_are_shrunk_to_the_backend_cap():
    from app.pipeline.pipeline import _encode_evidence

    # Pure noise barely compresses: ~790 KB at 960x720, over the 768 KB cap.
    noise = np.random.default_rng(1).integers(0, 256, (720, 960, 3), dtype=np.uint8)
    encoded = _encode_evidence(noise, max_bytes=760 * 1024)
    assert encoded is not None and len(encoded) <= 760 * 1024

    tiny_cap = _encode_evidence(noise, max_bytes=20 * 1024)
    assert tiny_cap is not None and len(tiny_cap) <= 20 * 1024

    flat = np.full((720, 960, 3), 90, np.uint8)
    import cv2

    assert cv2.imdecode(np.frombuffer(_encode_evidence(flat), np.uint8), cv2.IMREAD_COLOR).shape == flat.shape
    assert _encode_evidence(None) is None
