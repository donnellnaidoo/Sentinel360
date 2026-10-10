"""Accuracy measurement for scripts/evaluate.py — the parts that need no
model, so they're unit-tested and fast enough to sweep thresholds.

The models run once per clip (scripts/evaluate.py) and their raw outputs
are cached: per processed frame, every detection, the SlowFast score (when
one finished) and the poses. `replay` then runs the same confirmation
rules the live pipeline uses (KnifeConfirmer, AnomalyConfirmer,
AltercationAnalyzer) over that record for any set of alarm settings, and
`score` compares the alarms with the labelled events.
"""

from __future__ import annotations

import itertools
import json
from dataclasses import asdict, dataclass, field, replace
from pathlib import Path
from typing import Any

import numpy as np

from app.config import settings
from app.pipeline.anomaly import AnomalyConfirmer, AnomalyResult
from app.pipeline.pose import AltercationAnalyzer, PersonPose
from app.pipeline.weapon import KnifeConfirmer, ViewDetection, best_knife_per_view

EVENT_TYPES = ("WEAPON_DETECTED", "ANOMALY_DETECTED", "ALTERCATION")
# An alarm counts for a labelled event if it fires between this long before
# the labelled start and this long after the labelled end.
EARLY_TOLERANCE_SECONDS = 1.0
LATE_TOLERANCE_SECONDS = 2.0


# --- labels ---------------------------------------------------------------


@dataclass(frozen=True)
class LabelledEvent:
    type: str
    start: float
    end: float


@dataclass(frozen=True)
class Clip:
    file: Path
    panoramic: bool
    events: tuple[LabelledEvent, ...]
    notes: str = ""


def load_labels(path: Path) -> list[Clip]:
    """eval/labels.json — see eval/labels.example.json. Clip paths are
    relative to the labels file."""
    data = json.loads(path.read_text())
    clips = []
    for item in data["clips"]:
        events = []
        for event in item.get("events", []):
            if event["type"] not in EVENT_TYPES:
                raise ValueError(f"{item['file']}: unknown event type {event['type']!r} (one of {EVENT_TYPES})")
            if event["end"] < event["start"]:
                raise ValueError(f"{item['file']}: event ends before it starts")
            events.append(LabelledEvent(event["type"], float(event["start"]), float(event["end"])))
        clips.append(
            Clip(
                file=(path.parent / item["file"]).resolve(),
                panoramic=bool(item.get("panoramic", settings.stream_panoramic)),
                events=tuple(events),
                notes=item.get("notes", ""),
            )
        )
    return clips


# --- alarm settings -----------------------------------------------------------


@dataclass(frozen=True)
class AlarmSettings:
    """Everything that decides when a cached detection becomes an alarm.
    Changing these needs no model re-run."""

    knife_alarm_confidence: float = settings.knife_alarm_confidence
    knife_consecutive_required: int = settings.knife_consecutive_required
    knife_window_frames: int = settings.knife_window_frames
    knife_high_conf_bypass: float = settings.knife_high_conf_bypass
    weapon_require_person: bool = settings.weapon_require_person
    weapon_person_margin: float = settings.weapon_person_margin
    weapon_alarm_cooldown_seconds: float = settings.weapon_alarm_cooldown_seconds
    weapon_alarm_labels: tuple[str, ...] = tuple(settings.weapon_alarm_labels)
    anomaly_threshold: float = settings.anomaly_threshold
    anomaly_consecutive_required: int = settings.anomaly_consecutive_required
    pose_strike_speed: float = settings.pose_strike_speed
    pose_close_distance: float = settings.pose_close_distance
    pose_consecutive_required: int = settings.pose_consecutive_required
    pose_alarm_cooldown_seconds: float = settings.pose_alarm_cooldown_seconds


# --- replay ---------------------------------------------------------------


@dataclass(frozen=True)
class Alarm:
    type: str
    time: float
    view: str | None
    detail: str


def _detections(frame: dict[str, Any]) -> dict[str, list[ViewDetection]]:
    return {
        view: [ViewDetection(view, d[0], d[1], (d[2], d[3], d[4], d[5])) for d in dets]
        for view, dets in frame["detections"].items()
    }


def _poses(frame: dict[str, Any]) -> dict[str, list[PersonPose]]:
    return {
        view: [PersonPose(tuple(p["bbox"]), p["confidence"], np.array(p["keypoints"], dtype=np.float32)) for p in people]
        for view, people in (frame.get("poses") or {}).items()
    }


def replay(record: dict[str, Any], alarm: AlarmSettings) -> list[Alarm]:
    """The alarms the live pipeline would have raised on this clip."""
    knives = KnifeConfirmer(
        consecutive_required=alarm.knife_consecutive_required,
        high_conf_bypass=alarm.knife_high_conf_bypass,
        cooldown_seconds=alarm.weapon_alarm_cooldown_seconds,
        window_frames=alarm.knife_window_frames,
    )
    anomaly = AnomalyConfirmer(threshold=alarm.anomaly_threshold, consecutive_required=alarm.anomaly_consecutive_required)
    pose = AltercationAnalyzer(
        strike_speed=alarm.pose_strike_speed,
        close_distance=alarm.pose_close_distance,
        consecutive_required=alarm.pose_consecutive_required,
        cooldown_seconds=alarm.pose_alarm_cooldown_seconds,
    )

    alarms: list[Alarm] = []
    for frame in record["frames"]:
        t = frame["t"]
        candidates = best_knife_per_view(
            _detections(frame),
            alarm.knife_alarm_confidence,
            alarm_labels=alarm.weapon_alarm_labels,
            require_person=alarm.weapon_require_person,
            person_margin=alarm.weapon_person_margin,
        )
        for obs in knives.update(candidates, now=t):
            if obs.alarm_fired:
                alarms.append(Alarm("WEAPON_DETECTED", t, obs.view, f"{obs.label} {obs.confidence:.2f}"))

        if frame.get("anomaly") is not None:
            result = frame["anomaly"]
            obs = anomaly.update(AnomalyResult(result["p"], int(result["p"] >= 0.5), result.get("view")))
            if obs.alarm_fired:
                alarms.append(Alarm("ANOMALY_DETECTED", t, obs.view, f"p={obs.probability:.2f}"))

        if "poses" in frame:
            for obs in pose.update(t, _poses(frame)):
                if obs.alarm_fired:
                    alarms.append(Alarm("ALTERCATION", t, obs.view, obs.reason))
    return alarms


# --- scoring ----------------------------------------------------------------


@dataclass
class TypeScore:
    type: str
    labelled: int = 0
    detected: int = 0
    alarms: int = 0
    correct_alarms: int = 0
    false_alarms: int = 0
    times_to_detect: list[float] = field(default_factory=list)
    hours: float = 0.0

    @property
    def recall(self) -> float | None:
        return self.detected / self.labelled if self.labelled else None

    @property
    def precision(self) -> float | None:
        return self.correct_alarms / self.alarms if self.alarms else None

    @property
    def f1(self) -> float | None:
        p, r = self.precision, self.recall
        if p is None or r is None:
            return None
        return 0.0 if p + r == 0 else 2 * p * r / (p + r)

    @property
    def false_alarms_per_hour(self) -> float | None:
        return self.false_alarms / self.hours if self.hours else None

    def summary(self) -> dict[str, Any]:
        ttd = self.times_to_detect
        return {
            "type": self.type,
            "labelled": self.labelled,
            "detected": self.detected,
            "alarms": self.alarms,
            "false_alarms": self.false_alarms,
            "recall": self.recall,
            "precision": self.precision,
            "f1": self.f1,
            "false_alarms_per_hour": self.false_alarms_per_hour,
            "median_seconds_to_detect": float(np.median(ttd)) if ttd else None,
            "mean_seconds_to_detect": float(np.mean(ttd)) if ttd else None,
        }


@dataclass(frozen=True)
class ClipResult:
    file: str
    alarms: list[Alarm]
    missed: list[LabelledEvent]
    false_alarms: list[Alarm]


def _in_window(t: float, event: LabelledEvent) -> bool:
    return event.start - EARLY_TOLERANCE_SECONDS <= t <= event.end + LATE_TOLERANCE_SECONDS


def score(
    clips: list[Clip], alarms_by_clip: dict[Path, list[Alarm]], durations: dict[Path, float]
) -> tuple[dict[str, TypeScore], list[ClipResult]]:
    hours = sum(durations.values()) / 3600
    scores = {t: TypeScore(t, hours=hours) for t in EVENT_TYPES}
    per_clip = []
    for clip in clips:
        alarms = alarms_by_clip.get(clip.file, [])
        missed: list[LabelledEvent] = []
        false: list[Alarm] = []
        for event in clip.events:
            s = scores[event.type]
            s.labelled += 1
            hits = [a.time for a in alarms if a.type == event.type and _in_window(a.time, event)]
            if hits:
                s.detected += 1
                s.times_to_detect.append(max(0.0, min(hits) - event.start))
            else:
                missed.append(event)
        for alarm in alarms:
            s = scores[alarm.type]
            s.alarms += 1
            if any(e.type == alarm.type and _in_window(alarm.time, e) for e in clip.events):
                s.correct_alarms += 1
            else:
                s.false_alarms += 1
                false.append(alarm)
        per_clip.append(ClipResult(clip.file.name, alarms, missed, false))
    return scores, per_clip


# --- sweeps -------------------------------------------------------------------

SWEEP_GRIDS: dict[str, dict[str, list[Any]]] = {
    "WEAPON_DETECTED": {
        "knife_alarm_confidence": [0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6],
        "knife_consecutive_required": [1, 2, 3, 4],
        "knife_window_frames": [0, 2],  # extra frames on top of consecutive_required
        "knife_high_conf_bypass": [0.75, 0.85, 0.95],
        "weapon_require_person": [False, True],
    },
    "ANOMALY_DETECTED": {
        "anomaly_threshold": [round(0.3 + 0.05 * i, 2) for i in range(13)],
        "anomaly_consecutive_required": [1, 2, 3, 4],
    },
    "ALTERCATION": {
        "pose_strike_speed": [1.5, 2.0, 2.5, 3.0, 4.0],
        "pose_close_distance": [0.3, 0.5, 0.8],
        "pose_consecutive_required": [1, 2, 3],
    },
}


def sweep_candidates(event_type: str, base: AlarmSettings) -> list[AlarmSettings]:
    grid = SWEEP_GRIDS[event_type]
    keys = list(grid)
    candidates = []
    for values in itertools.product(*(grid[k] for k in keys)):
        changes = dict(zip(keys, values))
        if "knife_window_frames" in changes:
            changes["knife_window_frames"] += changes["knife_consecutive_required"]
        candidates.append(replace(base, **changes))
    return candidates


def sweep(
    event_type: str,
    clips: list[Clip],
    records: dict[Path, dict[str, Any]],
    base: AlarmSettings,
) -> list[tuple[AlarmSettings, TypeScore]]:
    """Every grid combination for one event type, best first: highest F1,
    then fewest false alarms per hour, then fastest detection, then fewest
    changes from the current settings."""
    durations = {path: record["duration"] for path, record in records.items()}
    results = []
    for candidate in sweep_candidates(event_type, base):
        alarms = {path: [a for a in replay(record, candidate) if a.type == event_type] for path, record in records.items()}
        scores, _ = score(clips, alarms, durations)
        results.append((candidate, scores[event_type]))

    def rank(item: tuple[AlarmSettings, TypeScore]):
        s = item[1]
        ttd = float(np.median(s.times_to_detect)) if s.times_to_detect else float("inf")
        changes = len(changed_settings(item[0], base, event_type))
        return (-(s.f1 or 0.0), s.false_alarms_per_hour or 0.0, ttd, changes)

    return sorted(results, key=rank)


def changed_settings(candidate: AlarmSettings, base: AlarmSettings, event_type: str) -> dict[str, Any]:
    keys = SWEEP_GRIDS[event_type]
    return {k: v for k, v in asdict(candidate).items() if k in keys and v != getattr(base, k)}


# Below this many SlowFast passes on normal footage, a 99.5th percentile is
# mostly noise (about one pass would be over it).
MIN_CALIBRATION_PASSES = 200


# --- anomaly calibration ------------------------------------------------------------


def anomaly_scores(clips: list[Clip], records: dict[Path, dict[str, Any]]) -> tuple[list[float], list[float]]:
    """SlowFast scores outside any labelled anomaly/altercation (normal
    activity) and inside labelled anomaly events."""
    normal: list[float] = []
    abnormal: list[float] = []
    for clip in clips:
        record = records.get(clip.file)
        if record is None:
            continue
        windows = [e for e in clip.events if e.type in ("ANOMALY_DETECTED", "ALTERCATION")]
        for frame in record["frames"]:
            if frame.get("anomaly") is None:
                continue
            p = frame["anomaly"]["p"]
            inside = [e for e in windows if _in_window(frame["t"], e)]
            if not inside:
                normal.append(p)
            elif any(e.type == "ANOMALY_DETECTED" and e.start <= frame["t"] <= e.end for e in inside):
                abnormal.append(p)
    return normal, abnormal


def calibrate(normal: list[float], abnormal: list[float], percentile: float = 99.5) -> dict[str, Any]:
    """Threshold at `percentile` of the scores on normal footage, i.e.
    roughly (100 - percentile)% of normal SlowFast passes would be over it
    (persistence then filters most of those)."""
    if not normal:
        raise ValueError("No SlowFast scores on normal footage — label some clips with no anomaly events")
    threshold = float(np.ceil(np.percentile(normal, percentile) * 100) / 100)
    report: dict[str, Any] = {
        "normal_passes": len(normal),
        "normal_percentiles": {str(q): float(np.percentile(normal, q)) for q in (50, 90, 99, 99.5)},
        "recommended_threshold": min(threshold, 0.99),
        "percentile": percentile,
        "enough_data": len(normal) >= MIN_CALIBRATION_PASSES,
    }
    if abnormal:
        report["anomaly_passes"] = len(abnormal)
        report["anomaly_median"] = float(np.median(abnormal))
        report["anomaly_passes_over_threshold"] = float(np.mean(np.array(abnormal) >= report["recommended_threshold"]))
    return report
