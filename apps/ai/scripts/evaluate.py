"""Measure the pipeline's accuracy on labelled clips.

  uv run python scripts/evaluate.py run         # precision / recall / false alarms per hour / time to detect
  uv run python scripts/evaluate.py sweep       # which alarm settings would have done best
  uv run python scripts/evaluate.py calibrate   # SlowFast threshold from normal footage

Clips and labels live in eval/ (see eval/README.md): eval/labels.json lists
each clip and when each event happens in it. Record clips with
scripts/record_clip.py.

The models run once per clip, the way the live pipeline does (TARGET_FPS
frames per second, the same views and settings), and their raw outputs are
cached in eval/cache/. sweep and calibrate only replay that cache, so they
take seconds. Changing a model setting (model file, input size, SlowFast
clip/view mode, ...) re-runs the models; change them with --set:

  uv run python scripts/evaluate.py run --set WEAPON_MODEL_PATH=models/weapon_yolo11n.pt \\
      --set 'WEAPON_ALARM_LABELS=["knife","pistol"]'

Differences from live: SlowFast scores every ANOMALY_INFERENCE_STRIDE
frames (live skips a pass while the previous one is still running, so on
slow hardware it scores less often), and its results are used immediately
rather than ~0.6 s later.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any

AI_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LABELS = AI_ROOT / "eval" / "labels.json"
CACHE_DIR = AI_ROOT / "eval" / "cache"

# Settings that change what the models output (so the cache key).
MODEL_SETTINGS = (
    "weapon_model_path",
    "weapon_person_model_path",
    "weapon_extra_model_path",
    "weapon_extra_labels",
    "weapon_alarm_labels",
    "detect_input_size",
    "weapon_display_confidence",
    "x3_view_fov",
    "x3_view_width",
    "x3_view_height",
    "target_fps",
    "anomaly_enabled",
    "slowfast_model_path",
    "anomaly_clip_seconds",
    "anomaly_view_mode",
    "anomaly_inference_stride",
    "pose_enabled",
    "pose_model_path",
    "pose_confidence",
)


def _apply_overrides(pairs: list[str]) -> None:
    """--set KEY=VALUE -> environment, read when app.config is imported."""
    for pair in pairs:
        key, sep, value = pair.partition("=")
        if not sep:
            raise SystemExit(f"--set expects KEY=VALUE, got {pair!r}")
        os.environ[key.strip().upper()] = value


def _cache_path(clip_file: Path, settings) -> Path:
    model_files = {}
    for key in (
        "weapon_model_path",
        "weapon_person_model_path",
        "weapon_extra_model_path",
        "slowfast_model_path",
        "pose_model_path",
    ):
        path = AI_ROOT / getattr(settings, key) if getattr(settings, key) else None
        model_files[key] = path.stat().st_mtime if path is not None and path.is_file() else None
    stat = clip_file.stat()
    key = json.dumps(
        {
            "clip": [str(clip_file), stat.st_size, stat.st_mtime],
            "settings": {k: getattr(settings, k) for k in MODEL_SETTINGS},
            "models": model_files,
        },
        sort_keys=True,
        default=str,
    )
    return CACHE_DIR / f"{clip_file.stem}-{hashlib.sha256(key.encode()).hexdigest()[:12]}.json"


class Models:
    """Loaded once for all clips."""

    def __init__(self, settings):
        from app.pipeline.anomaly import SlowFastAnomalyDetector
        from app.pipeline.pose import PoseEstimator
        from app.pipeline.weapon import WeaponDetector

        self.settings = settings
        self.weapon = WeaponDetector(
            settings.weapon_model_path,
            settings.weapon_device,
            alarm_labels=settings.weapon_alarm_labels,
            person_model_path=settings.weapon_person_model_path,
        )
        self.anomaly = (
            SlowFastAnomalyDetector(
                settings.slowfast_model_path,
                settings.anomaly_device,
                clip_seconds=settings.anomaly_clip_seconds,
                view_mode=settings.anomaly_view_mode,
            )
            if settings.anomaly_enabled
            else None
        )
        self.pose = PoseEstimator(settings.pose_model_path) if settings.pose_enabled else None

    def close(self) -> None:
        if self.anomaly is not None:
            self.anomaly.close()


def extract(clip, models: Models) -> dict[str, Any]:
    """Runs the models over one clip as the live pipeline would and returns
    the raw outputs per processed frame."""
    import cv2

    from app.pipeline.anomaly import ClipBuffer, clip_frame
    from app.pipeline.capture import Frame
    from app.pipeline.dewarp import ViewSplitter
    from app.pipeline.weapon import PERSON_LABEL

    settings = models.settings
    capture = cv2.VideoCapture(str(clip.file))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open {clip.file}")
    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    step = 1.0 / settings.target_fps
    splitter = ViewSplitter()
    clips = ClipBuffer(settings.anomaly_clip_seconds)
    # Live: with a timed clip window SlowFast sees every camera frame;
    # otherwise only the processed ones.
    feed_every_frame = settings.anomaly_clip_seconds > 0
    view_mode = settings.anomaly_view_mode

    frames: list[dict[str, Any]] = []
    index = 0
    next_processed = 0.0
    processed = 0
    t = 0.0
    while True:
        ok, image = capture.read()
        if not ok:
            break
        t = index / fps
        index += 1
        frame = Frame(image=image, frame_index=index, timestamp=t, panoramic=clip.panoramic)

        is_processed = t + 1e-6 >= next_processed
        if models.anomaly is not None and (feed_every_frame or is_processed) and clips.wants(t):
            clips.add(t, clip_frame(splitter.split(frame), view_mode))
        if not is_processed:
            continue
        next_processed += step
        processed += 1

        views = splitter.split(frame)
        detections = models.weapon.detect(views)
        record: dict[str, Any] = {
            "t": round(t, 3),
            "detections": {
                view: [[d.label, round(d.confidence, 4), *d.bbox] for d in dets] for view, dets in detections.items()
            },
        }
        people_views = {v for v, dets in detections.items() if any(d.label == PERSON_LABEL for d in dets)}

        if models.anomaly is not None and processed % settings.anomaly_inference_stride == 0:
            clip_frames = clips.clip()
            if clip_frames is not None:
                score_views = sorted(people_views) if view_mode == "per_view_people" else None
                result = models.anomaly.score(clip_frames, score_views)
                record["anomaly"] = {"p": round(result.probability, 4), "view": result.view, "per_view": result.per_view}

        if models.pose is not None:
            poses = models.pose.estimate({v: views[v] for v in sorted(people_views)})
            record["poses"] = {
                view: [
                    {"bbox": list(p.bbox), "confidence": round(p.confidence, 3), "keypoints": p.keypoints.round(1).tolist()}
                    for p in people
                ]
                for view, people in poses.items()
            }
        frames.append(record)

    capture.release()
    return {"file": str(clip.file), "duration": round(t, 3), "fps": fps, "frames": frames}


def load_records(clips, settings, *, refresh: bool) -> dict[Path, dict[str, Any]]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    records: dict[Path, dict[str, Any]] = {}
    models: Models | None = None
    try:
        for clip in clips:
            if not clip.file.is_file():
                print(f"  ! missing clip {clip.file} — skipped")
                continue
            cache = _cache_path(clip.file, settings)
            if cache.is_file() and not refresh:
                records[clip.file] = json.loads(cache.read_text())
                continue
            if models is None:
                print("Loading models...")
                models = Models(settings)
            started = time.time()
            print(f"  running models on {clip.file.name} ...", end="", flush=True)
            record = extract(clip, models)
            cache.write_text(json.dumps(record))
            records[clip.file] = record
            print(f" {record['duration']:.1f}s of video in {time.time() - started:.1f}s")
    finally:
        if models is not None:
            models.close()
    return records


def _fmt(value: float | None, pct: bool = False) -> str:
    if value is None:
        return "—"
    return f"{value * 100:.0f}%" if pct else f"{value:.2f}"


def print_scores(scores) -> None:
    print(f"\n{'event':<18}{'labelled':>9}{'found':>7}{'recall':>8}{'alarms':>8}{'false':>7}{'precision':>11}{'F1':>6}{'false/h':>9}{'median s':>10}")
    for s in scores.values():
        summary = s.summary()
        if not s.labelled and not s.alarms:
            continue
        print(
            f"{s.type:<18}{s.labelled:>9}{s.detected:>7}{_fmt(s.recall, True):>8}{s.alarms:>8}{s.false_alarms:>7}"
            f"{_fmt(s.precision, True):>11}{_fmt(s.f1):>6}{_fmt(s.false_alarms_per_hour):>9}"
            f"{_fmt(summary['median_seconds_to_detect']):>10}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=("run", "sweep", "calibrate"))
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS)
    parser.add_argument("--set", action="append", default=[], metavar="KEY=VALUE", help="override a setting (repeatable)")
    parser.add_argument("--refresh", action="store_true", help="re-run the models even if cached")
    parser.add_argument("--json", type=Path, help="also write the full results here")
    parser.add_argument("--top", type=int, default=10, help="sweep: how many settings to show per event type")
    parser.add_argument("--percentile", type=float, default=99.5, help="calibrate: percentile of normal scores")
    args = parser.parse_args()

    _apply_overrides(args.set)
    os.chdir(AI_ROOT)  # model paths in settings are relative to apps/ai
    sys.path.insert(0, str(AI_ROOT))
    from app import evaluation
    from app.config import settings

    if not args.labels.is_file():
        print(f"No labels at {args.labels} — copy eval/labels.example.json to eval/labels.json and fill it in.")
        return 2
    clips = evaluation.load_labels(args.labels)
    records = load_records(clips, settings, refresh=args.refresh)
    clips = [c for c in clips if c.file in records]
    if not clips:
        print("No clips to evaluate.")
        return 2
    durations = {path: record["duration"] for path, record in records.items()}
    base = evaluation.AlarmSettings()
    minutes = sum(durations.values()) / 60
    labelled = sum(len(c.events) for c in clips)
    print(f"\n{len(clips)} clips, {minutes:.1f} min of video, {labelled} labelled events")
    output: dict[str, Any] = {"settings": {k: getattr(settings, k) for k in MODEL_SETTINGS}, "alarm_settings": asdict(base)}

    if args.command == "run":
        alarms = {path: evaluation.replay(record, base) for path, record in records.items()}
        scores, per_clip = evaluation.score(clips, alarms, durations)
        print_scores(scores)
        print("\nPer clip (missed events and false alarms):")
        for result in per_clip:
            if not result.missed and not result.false_alarms:
                continue
            print(f"  {result.file}")
            for event in result.missed:
                print(f"    missed {event.type} at {event.start:.1f}-{event.end:.1f}s")
            for alarm in result.false_alarms:
                print(f"    false {alarm.type} at {alarm.time:.1f}s ({alarm.view or 'composite'}: {alarm.detail})")
        output["scores"] = [s.summary() for s in scores.values()]
        output["clips"] = [
            {
                "file": r.file,
                "alarms": [asdict(a) for a in r.alarms],
                "missed": [asdict(e) for e in r.missed],
                "false_alarms": [asdict(a) for a in r.false_alarms],
            }
            for r in per_clip
        ]

    elif args.command == "sweep":
        output["sweep"] = {}
        for event_type in evaluation.EVENT_TYPES:
            if not any(e.type == event_type for c in clips for e in c.events):
                continue
            if event_type == "ANOMALY_DETECTED" and not any("anomaly" in f for r in records.values() for f in r["frames"]):
                continue
            if event_type == "ALTERCATION" and not any("poses" in f for r in records.values() for f in r["frames"]):
                print("\nALTERCATION: no pose data — add --set POSE_ENABLED=true")
                continue
            results = evaluation.sweep(event_type, clips, records, base)
            alarms = {p: [a for a in evaluation.replay(r, base) if a.type == event_type] for p, r in records.items()}
            current = evaluation.score(clips, alarms, durations)[0][event_type]
            print(f"\n{event_type}: {len(results)} combinations")
            print(f"  current settings: recall {_fmt(current.recall, True)}, precision {_fmt(current.precision, True)}, "
                  f"F1 {_fmt(current.f1)}, {_fmt(current.false_alarms_per_hour)} false/h")
            for rank, (candidate, s) in enumerate(results[: args.top], start=1):
                changes = evaluation.changed_settings(candidate, base, event_type) or "(current settings)"
                print(f"  {rank:>2}. recall {_fmt(s.recall, True):>4}  precision {_fmt(s.precision, True):>4}  "
                      f"F1 {_fmt(s.f1)}  {_fmt(s.false_alarms_per_hour)} false/h  {changes}")
            output["sweep"][event_type] = [
                {"changes": evaluation.changed_settings(c, base, event_type), **s.summary()} for c, s in results[: args.top]
            ]
        print("\nSet the winners in apps/ai/.env (names in capitals), then check them with `run`.")
        print("Small eval sets overfit: prefer settings that rank well across several clips, and re-check on new footage.")

    else:
        normal, abnormal = evaluation.anomaly_scores(clips, records)
        report = evaluation.calibrate(normal, abnormal, args.percentile)
        print(f"\nSlowFast passes on normal activity: {report['normal_passes']}")
        for q, value in report["normal_percentiles"].items():
            print(f"  {q:>5}th percentile: {value:.3f}")
        if not report["enough_data"]:
            print(f"  ! only {report['normal_passes']} passes — record more normal footage "
                  f"(aim for {evaluation.MIN_CALIBRATION_PASSES}+, ~an hour) before trusting this")
        print(f"\nRecommended ANOMALY_THRESHOLD={report['recommended_threshold']:.2f} "
              f"(current {settings.anomaly_threshold:.2f})")
        if "anomaly_passes" in report:
            print(f"Inside labelled anomalies: {report['anomaly_passes']} passes, median {report['anomaly_median']:.3f}, "
                  f"{report['anomaly_passes_over_threshold'] * 100:.0f}% over the recommended threshold")
        else:
            print("No labelled ANOMALY_DETECTED events, so there's nothing to say about what it would still catch.")
        output["calibration"] = report

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(output, indent=2, default=str))
        print(f"\nWrote {args.json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
