"""KnifeConfirmer / best_knife_per_view / crop_with_padding — the alarm
rules from the model team's handoff, tested without loading YOLO.
"""

import numpy as np

from app.pipeline.weapon import (
    KnifeCandidate,
    KnifeConfirmer,
    ViewDetection,
    best_knife_per_view,
    crop_with_padding,
    near_person,
)

BOX = (10, 10, 50, 50)
VIEWS = ("Front", "Right", "Rear", "Left")


def _frame(**knives: float) -> dict[str, KnifeCandidate | None]:
    return {view: (KnifeCandidate(knives[view], BOX) if view in knives else None) for view in VIEWS}


def _confirmer() -> KnifeConfirmer:
    return KnifeConfirmer(consecutive_required=3, high_conf_bypass=0.85, cooldown_seconds=5)


def test_needs_three_consecutive_frames_in_same_view():
    confirmer = _confirmer()
    first = confirmer.update(_frame(Rear=0.5), now=0.0)
    second = confirmer.update(_frame(Rear=0.5), now=0.1)
    third = confirmer.update(_frame(Rear=0.5), now=0.2)

    assert [o.alarm_fired for o in first + second] == [False, False]
    assert third[0].confirmed and third[0].alarm_fired
    assert third[0].streak == 3
    assert third[0].confirmation_method == "3-frame persistence"


def test_gap_resets_streak():
    confirmer = _confirmer()
    confirmer.update(_frame(Rear=0.5), now=0.0)
    confirmer.update(_frame(Rear=0.5), now=0.1)
    confirmer.update(_frame(), now=0.2)
    (obs,) = confirmer.update(_frame(Rear=0.5), now=0.3)
    assert obs.streak == 1 and not obs.confirmed


def test_streaks_do_not_combine_across_views():
    confirmer = _confirmer()
    confirmer.update(_frame(Front=0.5), now=0.0)
    confirmer.update(_frame(Right=0.5), now=0.1)
    observations = confirmer.update(_frame(Rear=0.5), now=0.2)
    assert not any(o.confirmed for o in observations)


def test_high_confidence_bypasses_persistence():
    (obs,) = _confirmer().update(_frame(Left=0.9), now=0.0)
    assert obs.alarm_fired
    assert obs.confirmation_method == "high-confidence bypass"


def test_cooldown_is_shared_across_views():
    confirmer = _confirmer()
    fired = confirmer.update(_frame(Front=0.9, Rear=0.9), now=0.0)
    assert [o.alarm_fired for o in fired] == [True, False]
    assert all(o.confirmed for o in fired)

    (blocked,) = confirmer.update(_frame(Rear=0.9), now=4.0)
    assert blocked.confirmed and not blocked.alarm_fired

    (refired,) = confirmer.update(_frame(Rear=0.9), now=5.5)
    assert refired.alarm_fired


def test_best_knife_ignores_persons_and_low_confidence():
    detections = {
        "Front": [
            ViewDetection("Front", "person", 0.99, BOX),
            ViewDetection("Front", "knife", 0.40, BOX),
        ],
        "Rear": [
            ViewDetection("Rear", "knife", 0.50, BOX),
            ViewDetection("Rear", "knife", 0.70, (1, 2, 3, 4)),
        ],
    }
    best = best_knife_per_view(detections, min_confidence=0.45)
    assert best["Front"] is None
    assert best["Rear"] == KnifeCandidate(0.70, (1, 2, 3, 4))


def test_crop_pads_and_clamps_to_image():
    image = np.arange(100 * 100 * 3, dtype=np.uint8).reshape(100, 100, 3)
    crop = crop_with_padding(image, (40, 40, 60, 60), padding=0.2)
    assert crop is not None and crop.shape == (28, 28, 3)

    edge = crop_with_padding(image, (0, 0, 50, 50), padding=0.2)
    assert edge is not None and edge.shape == (60, 60, 3)

    assert crop_with_padding(image, (10, 10, 10, 30)) is None


def test_window_lets_one_missed_frame_through():
    confirmer = KnifeConfirmer(consecutive_required=3, high_conf_bypass=0.85, cooldown_seconds=5, window_frames=5)
    confirmer.update(_frame(Rear=0.5), now=0.0)
    confirmer.update(_frame(Rear=0.5), now=0.1)
    confirmer.update(_frame(), now=0.2)
    (obs,) = confirmer.update(_frame(Rear=0.5), now=0.3)
    assert obs.confirmed and obs.alarm_fired
    assert obs.streak == 1
    assert obs.confirmation_method == "3 of last 5 frames"


def test_window_equal_to_required_is_the_consecutive_rule():
    confirmer = KnifeConfirmer(consecutive_required=3, high_conf_bypass=0.85, cooldown_seconds=5, window_frames=3)
    for now, frame in enumerate([_frame(Rear=0.5), _frame(Rear=0.5), _frame(), _frame(Rear=0.5), _frame(Rear=0.5)]):
        observations = confirmer.update(frame, now=now)
        assert not any(o.confirmed for o in observations)


def test_alarm_labels_include_firearms_and_carry_the_class():
    detections = {
        "Front": [ViewDetection("Front", "pistol", 0.6, BOX), ViewDetection("Front", "knife", 0.5, BOX)],
        "Rear": [ViewDetection("Rear", "pistol", 0.6, BOX)],
    }
    best = best_knife_per_view(detections, min_confidence=0.45, alarm_labels=["knife", "pistol"])
    assert best["Front"] == KnifeCandidate(0.6, BOX, "pistol")

    knife_only = best_knife_per_view(detections, min_confidence=0.45, alarm_labels=["knife"])
    assert knife_only["Front"] == KnifeCandidate(0.5, BOX, "knife")
    assert knife_only["Rear"] is None

    (obs,) = _confirmer().update({"Front": KnifeCandidate(0.9, BOX, "pistol")}, now=0.0)
    assert obs.label == "pistol"


def test_near_person_uses_a_margin_around_the_person():
    person = (100, 100, 200, 300)  # 100 wide, 200 tall; margin 0.25 -> x 75..225, y 50..350
    assert near_person((140, 150, 160, 170), [person])  # in the hand area
    assert near_person((210, 150, 230, 170), [person], margin=0.25)  # arm outstretched
    assert not near_person((300, 150, 320, 170), [person], margin=0.25)
    assert not near_person((140, 150, 160, 170), [])


def test_require_person_drops_weapons_away_from_people():
    on_counter = ViewDetection("Front", "knife", 0.7, (400, 400, 420, 410))
    in_hand = ViewDetection("Front", "knife", 0.5, (140, 150, 160, 170))
    person = ViewDetection("Front", "person", 0.9, (100, 100, 200, 300))

    gated = best_knife_per_view(
        {"Front": [on_counter, in_hand, person]}, min_confidence=0.45, alarm_labels=["knife"], require_person=True
    )
    assert gated["Front"] == KnifeCandidate(0.5, in_hand.bbox, "knife")

    alone = best_knife_per_view(
        {"Front": [on_counter]}, min_confidence=0.45, alarm_labels=["knife"], require_person=True
    )
    assert alone["Front"] is None

    ungated = best_knife_per_view({"Front": [on_counter, in_hand, person]}, min_confidence=0.45, alarm_labels=["knife"])
    assert ungated["Front"] == KnifeCandidate(0.7, on_counter.bbox, "knife")
