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
