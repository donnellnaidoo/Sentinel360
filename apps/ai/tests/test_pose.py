"""AltercationAnalyzer rules on hand-made poses — no pose model needed."""

import numpy as np

from app.pipeline.pose import (
    LEFT_WRIST,
    RIGHT_WRIST,
    AltercationAnalyzer,
    PersonPose,
    are_close,
    match_people,
    wrist_speed,
)


def _person(x1, y1, x2, y2, wrist=None) -> PersonPose:
    keypoints = np.zeros((17, 3), dtype=np.float32)
    if wrist is not None:
        keypoints[RIGHT_WRIST] = (*wrist, 0.9)
        keypoints[LEFT_WRIST] = (*wrist, 0.9)
    return PersonPose((x1, y1, x2, y2), 0.9, keypoints)


def _analyzer(**kwargs) -> AltercationAnalyzer:
    defaults = dict(strike_speed=2.5, close_distance=0.5, consecutive_required=2, window_frames=5, cooldown_seconds=10)
    return AltercationAnalyzer(**{**defaults, **kwargs})


def test_wrist_speed_is_in_body_heights_per_second():
    before = _person(0, 0, 50, 200, wrist=(40, 100))
    after = _person(0, 0, 50, 200, wrist=(140, 100))  # 100 px = 0.5 body heights
    assert wrist_speed(before, after, dt=0.2) == 2.5
    assert wrist_speed(_person(0, 0, 50, 200), after, dt=0.2) == 0.0  # wrist not visible before


def test_close_needs_similar_size():
    a = _person(0, 0, 50, 200)
    assert are_close(a, _person(60, 0, 110, 200))  # 10 px gap, mean width 50
    assert not are_close(a, _person(200, 0, 250, 200))
    assert not are_close(a, _person(55, 0, 70, 60))  # much smaller: further away


def test_match_people_pairs_by_nearest_centre():
    a, b = _person(0, 0, 50, 200), _person(300, 0, 350, 200)
    moved_a, moved_b = _person(10, 0, 60, 200), _person(310, 0, 360, 200)
    pairs = match_people([a, b], [moved_b, moved_a])
    assert (a, moved_a) in pairs and (b, moved_b) in pairs
    assert match_people([a], [_person(600, 0, 650, 200)]) == []


def _fight_frame(arm_out: bool):
    puncher = _person(100, 0, 150, 200, wrist=(240 if arm_out else 140, 80))
    victim = _person(160, 0, 210, 200)
    return [puncher, victim]


def test_repeated_strikes_between_close_people_raise_one_alarm():
    analyzer = _analyzer()
    fired = []
    for i in range(8):
        observations = analyzer.update(i * 0.2, {"Front": _fight_frame(arm_out=i % 2 == 1)})
        fired += [o for o in observations if o.alarm_fired]
    assert len(fired) == 1
    assert fired[0].reason == "strike" and fired[0].view == "Front"


def test_fast_arms_alone_are_not_a_fight():
    analyzer = _analyzer()
    for i in range(8):
        wrist = (240 if i % 2 else 140, 80)
        observations = analyzer.update(i * 0.2, {"Front": [_person(100, 0, 150, 200, wrist=wrist)]})
        assert not any(o.confirmed for o in observations)


def test_a_fall_is_upright_then_lying():
    analyzer = _analyzer(consecutive_required=1)
    analyzer.update(0.0, {"Rear": [_person(100, 0, 150, 200)]})
    (obs,) = analyzer.update(0.4, {"Rear": [_person(60, 150, 220, 200)]})
    assert obs.reason == "fall" and obs.alarm_fired


def test_lying_still_is_not_a_fall():
    analyzer = _analyzer(consecutive_required=1)
    for i in range(5):
        assert analyzer.update(i * 0.4, {"Rear": [_person(60, 150, 220, 200)]}) == []
