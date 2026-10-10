"""AnomalyConfirmer + EventQueue — no SlowFast model needed."""

from app.pipeline.anomaly import AnomalyConfirmer, AnomalyResult
from app.pipeline.events import DetectionEvent, EventQueue


def _feed(confirmer: AnomalyConfirmer, *probabilities: float):
    return [confirmer.update(AnomalyResult(p, int(p >= 0.5))) for p in probabilities]


def test_needs_three_fresh_results_above_threshold():
    observations = _feed(AnomalyConfirmer(threshold=0.6, consecutive_required=3), 0.7, 0.65, 0.61)
    assert [o.confirmed for o in observations] == [False, False, True]
    assert [o.alarm_fired for o in observations] == [False, False, True]


def test_threshold_is_inclusive_and_dip_resets_streak():
    observations = _feed(AnomalyConfirmer(threshold=0.6, consecutive_required=3), 0.6, 0.6, 0.59, 0.6, 0.6)
    assert [o.streak for o in observations] == [1, 2, 0, 1, 2]
    assert not any(o.confirmed for o in observations)


def test_one_alarm_per_continuous_event_then_rearms():
    confirmer = AnomalyConfirmer(threshold=0.6, consecutive_required=3)
    first_event = _feed(confirmer, 0.7, 0.7, 0.7, 0.8, 0.9, 0.75)
    assert sum(o.alarm_fired for o in first_event) == 1
    assert all(o.confirmed for o in first_event[2:])

    second_event = _feed(confirmer, 0.2, 0.7, 0.7, 0.7)
    assert [o.alarm_fired for o in second_event] == [False, False, False, True]


def _event(n: int) -> DetectionEvent:
    return DetectionEvent(event_type="WEAPON_DETECTED", camera_id="CAM", confidence=0.5, summary=str(n))


def test_event_queue_drops_oldest_when_full():
    events = EventQueue(maxsize=2)
    for n in range(4):
        events.put(_event(n))

    assert events.dropped == 2
    assert [events.get(timeout=0).summary, events.get(timeout=0).summary] == ["2", "3"]
    assert events.get(timeout=0) is None


def test_event_describe_has_no_image_bytes():
    event = _event(1)
    event.snapshot_jpeg = b"\xff\xd8"
    described = event.describe()
    assert described["has_snapshot"] is True
    assert b"\xff\xd8" not in repr(described).encode()


# --- ClipBuffer / clip_frame -------------------------------------------------

import numpy as np

from app.pipeline.anomaly import NUM_FRAMES, ClipBuffer, clip_frame


def _views(value: int = 90) -> dict[str, np.ndarray]:
    return {name: np.full((360, 480, 3), value, dtype=np.uint8) for name in ("Front", "Right", "Rear", "Left")}


def test_untimed_buffer_is_the_last_32_frames():
    buffer = ClipBuffer(clip_seconds=0)
    for i in range(NUM_FRAMES - 1):
        buffer.add(i * 0.2, {"composite": np.full((2, 2, 3), i, np.uint8)})
    assert buffer.clip() is None

    for i in range(NUM_FRAMES - 1, NUM_FRAMES + 4):
        buffer.add(i * 0.2, {"composite": np.full((2, 2, 3), i, np.uint8)})
    clip = buffer.clip()
    # Frames 0..35 were added; the clip is the newest 32.
    assert clip is not None and len(clip) == NUM_FRAMES
    assert [int(f["composite"][0, 0, 0]) for f in clip] == list(range(4, NUM_FRAMES + 4))


def test_timed_buffer_spans_the_window_at_native_rate():
    buffer = ClipBuffer(clip_seconds=1.5)
    for i in range(300):  # 10 s of 30 fps video
        buffer.add(i / 30, {"v": np.full((2, 2, 3), i, np.uint16)})

    # Frames closer than 1.5 / 32 s apart aren't stored.
    assert len(buffer) <= NUM_FRAMES * 2
    clip = buffer.clip()
    assert clip is not None and len(clip) == NUM_FRAMES
    indices = [int(f["v"][0, 0, 0]) for f in clip]
    assert indices == sorted(indices)
    # Covers roughly the last 1.5 s (45 frames) of the 300.
    assert 299 - 50 <= indices[0] <= 299 - 40
    assert indices[-1] >= 297
    assert len(set(indices)) >= NUM_FRAMES * 0.6


def test_timed_buffer_needs_enough_real_frames():
    buffer = ClipBuffer(clip_seconds=1.5)
    # A 2 fps source: 4 frames in 1.5 s isn't a clip.
    for i in range(10):
        buffer.add(i * 0.5, {"v": np.zeros((2, 2, 3), np.uint8)})
    assert buffer.clip() is None


def test_timed_buffer_restarts_when_a_file_loops():
    buffer = ClipBuffer(clip_seconds=1.0)
    for i in range(60):
        buffer.add(i / 30, {"v": np.zeros((2, 2, 3), np.uint8)})
    buffer.add(0.0, {"v": np.zeros((2, 2, 3), np.uint8)})
    assert len(buffer) == 1


def test_clip_frame_modes():
    views = _views()
    (composite,) = clip_frame(views, "composite").values()
    assert composite.shape == (448, 448, 3)

    per_view = clip_frame(views, "per_view")
    assert sorted(per_view) == ["Front", "Left", "Rear", "Right"]
    assert all(image.shape == (224, 224, 3) for image in per_view.values())

    single = {"Main": np.full((480, 640, 3), 7, np.uint8)}
    (copy,) = clip_frame(single, "composite").values()
    assert copy.shape == (480, 640, 3) and copy is not single["Main"]
