"""Replay, scoring, sweeps and calibration on hand-made cached records —
no models or video needed."""

import json
from pathlib import Path

import pytest

from app.evaluation import (
    AlarmSettings,
    Clip,
    LabelledEvent,
    calibrate,
    load_labels,
    replay,
    score,
    sweep,
)

BASE = AlarmSettings(
    knife_alarm_confidence=0.45,
    knife_consecutive_required=3,
    knife_window_frames=3,
    knife_high_conf_bypass=0.85,
    weapon_require_person=False,
    weapon_alarm_cooldown_seconds=5.0,
    weapon_alarm_labels=("knife",),
    anomaly_threshold=0.6,
    anomaly_consecutive_required=3,
)


def _record(knife_confidences: list[float | None], anomaly: list[float | None] | None = None, fps: float = 5.0):
    frames = []
    for i, conf in enumerate(knife_confidences):
        dets = [["knife", conf, 10, 10, 50, 50]] if conf is not None else []
        frame = {"t": i / fps, "detections": {"Main": dets}}
        if anomaly is not None and anomaly[i] is not None:
            frame["anomaly"] = {"p": anomaly[i], "view": None}
        frames.append(frame)
    return {"duration": len(knife_confidences) / fps, "frames": frames}


def test_replay_applies_the_live_confirmation_rules():
    record = _record([None, 0.5, 0.5, 0.5, 0.5, None])
    (alarm,) = replay(record, BASE)
    assert alarm.type == "WEAPON_DETECTED" and alarm.time == pytest.approx(0.6)  # third frame of the streak

    assert replay(record, AlarmSettings(**{**BASE.__dict__, "knife_alarm_confidence": 0.55})) == []


def test_replay_anomaly_persistence():
    record = _record([None] * 6, anomaly=[0.7, None, 0.7, None, 0.7, None])
    (alarm,) = replay(record, BASE)
    assert alarm.type == "ANOMALY_DETECTED" and alarm.time == pytest.approx(0.8)


def test_score_counts_hits_misses_false_alarms_and_time_to_detect():
    knife = Path("/clips/knife.mp4")
    empty = Path("/clips/empty.mp4")
    clips = [
        Clip(knife, False, (LabelledEvent("WEAPON_DETECTED", 2.0, 6.0), LabelledEvent("WEAPON_DETECTED", 20.0, 22.0))),
        Clip(empty, False, ()),
    ]
    from app.evaluation import Alarm

    alarms = {
        knife: [Alarm("WEAPON_DETECTED", 2.6, "Main", ""), Alarm("WEAPON_DETECTED", 12.0, "Main", "")],
        empty: [Alarm("WEAPON_DETECTED", 3.0, "Main", "")],
    }
    scores, per_clip = score(clips, alarms, {knife: 1800.0, empty: 1800.0})
    s = scores["WEAPON_DETECTED"]
    assert (s.labelled, s.detected, s.alarms, s.false_alarms) == (2, 1, 3, 2)
    assert s.recall == 0.5
    assert s.precision == pytest.approx(1 / 3)
    assert s.false_alarms_per_hour == 2.0
    assert s.times_to_detect == [pytest.approx(0.6)]
    assert [e.start for e in per_clip[0].missed] == [20.0]


def test_alarm_just_before_the_label_counts_but_not_long_after():
    clip = Clip(Path("/c.mp4"), False, (LabelledEvent("WEAPON_DETECTED", 5.0, 6.0),))
    from app.evaluation import Alarm

    early, _ = score([clip], {clip.file: [Alarm("WEAPON_DETECTED", 4.2, None, "")]}, {clip.file: 10})
    late, _ = score([clip], {clip.file: [Alarm("WEAPON_DETECTED", 9.0, None, "")]}, {clip.file: 10})
    assert early["WEAPON_DETECTED"].detected == 1
    assert early["WEAPON_DETECTED"].times_to_detect == [0.0]
    assert late["WEAPON_DETECTED"].detected == 0 and late["WEAPON_DETECTED"].false_alarms == 1


def test_sweep_finds_a_lower_threshold_for_a_faint_knife():
    clip = Clip(Path("/faint.mp4"), False, (LabelledEvent("WEAPON_DETECTED", 0.0, 2.0),))
    records = {clip.file: _record([0.4] * 10)}
    best, best_score = sweep("WEAPON_DETECTED", [clip], records, BASE)[0]
    assert best_score.recall == 1.0
    assert best.knife_alarm_confidence < 0.4


def test_sweep_prefers_fewest_changes_on_ties():
    clip = Clip(Path("/k.mp4"), False, (LabelledEvent("WEAPON_DETECTED", 0.0, 2.0),))
    records = {clip.file: _record([0.9] * 10)}  # every setting catches this
    best, _ = sweep("WEAPON_DETECTED", [clip], records, BASE)[0]
    assert best == BASE


def test_calibrate_threshold_from_normal_scores():
    normal = [i / 1000 for i in range(1000)]  # 0.000 .. 0.999
    report = calibrate(normal, abnormal=[0.999, 0.5], percentile=99.0)
    assert report["recommended_threshold"] == 0.99
    assert report["enough_data"] is True
    assert report["anomaly_passes_over_threshold"] == 0.5
    assert calibrate([0.1] * 10, [])["enough_data"] is False
    with pytest.raises(ValueError):
        calibrate([], [])


def test_load_labels_resolves_paths_and_validates(tmp_path):
    labels = tmp_path / "labels.json"
    labels.write_text(json.dumps({"clips": [{"file": "clips/a.mp4", "panoramic": True, "events": [{"type": "WEAPON_DETECTED", "start": 1, "end": 2}]}]}))
    (clip,) = load_labels(labels)
    assert clip.file == (tmp_path / "clips" / "a.mp4").resolve()
    assert clip.panoramic and clip.events == (LabelledEvent("WEAPON_DETECTED", 1.0, 2.0),)

    labels.write_text(json.dumps({"clips": [{"file": "a.mp4", "events": [{"type": "FIGHT", "start": 1, "end": 2}]}]}))
    with pytest.raises(ValueError, match="unknown event type"):
        load_labels(labels)
