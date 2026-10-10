"""Pose-based altercation detection. EXPERIMENTAL, off by default
(settings.pose_enabled).

An explainable alternative to the SlowFast anomaly model: YOLO11n-pose
finds each person's keypoints, and simple rules decide what counts —
  strike  a wrist moving faster than pose_strike_speed body heights per
          second while that person is close to someone else
  fall    a person's box going from upright to lying down within ~1 s
Each alarm says which rule fired and in which view.

Split like weapon.py:
  PoseEstimator         - one batched YOLO-pose pass (I/O, model)
  AltercationAnalyzer   - pure rules + persistence/cooldown, no model
"""

from __future__ import annotations

import collections
import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.config import settings
from app.pipeline.device import resolve_device

logger = logging.getLogger(__name__)

BBox = tuple[int, int, int, int]

# COCO keypoint indices.
LEFT_WRIST = 9
RIGHT_WRIST = 10
KEYPOINT_MIN_CONFIDENCE = 0.3

# Box height / width: above UPRIGHT_RATIO is standing, below LYING_RATIO is
# lying down. A fall is upright -> lying within FALL_WINDOW_SECONDS.
UPRIGHT_RATIO = 1.3
LYING_RATIO = 0.9
FALL_WINDOW_SECONDS = 1.2
# Persons in consecutive frames are the same person if their box centres
# moved less than this many body heights.
MATCH_DISTANCE = 0.5
# Two people at very different distances from the camera aren't "close"
# even if their boxes touch on screen.
MIN_SCALE_RATIO = 0.6


@dataclass(frozen=True)
class PersonPose:
    bbox: BBox
    confidence: float
    # (17, 3): x, y, confidence per COCO keypoint, in view pixels.
    keypoints: np.ndarray

    @property
    def height(self) -> float:
        return max(1.0, float(self.bbox[3] - self.bbox[1]))

    @property
    def width(self) -> float:
        return max(1.0, float(self.bbox[2] - self.bbox[0]))

    @property
    def center(self) -> tuple[float, float]:
        return ((self.bbox[0] + self.bbox[2]) / 2, (self.bbox[1] + self.bbox[3]) / 2)

    def wrist(self, index: int) -> tuple[float, float] | None:
        x, y, conf = self.keypoints[index]
        return (float(x), float(y)) if conf >= KEYPOINT_MIN_CONFIDENCE else None


class PoseEstimator:
    def __init__(self, model_path: str = settings.pose_model_path, device: str = settings.weapon_device):
        from ultralytics import YOLO

        self._model = YOLO(model_path)
        self.device = resolve_device(device)
        self.model_name = Path(model_path).stem

    def estimate(self, views: dict[str, np.ndarray]) -> dict[str, list[PersonPose]]:
        """Poses per view, in one batch. Pass only the views worth
        analysing (e.g. ones the weapon model saw a person in)."""
        if not views:
            return {}
        names = list(views)
        results = self._model.predict(
            [views[name] for name in names],
            conf=settings.pose_confidence,
            imgsz=settings.detect_input_size,
            device=self.device,
            verbose=False,
        )
        poses: dict[str, list[PersonPose]] = {name: [] for name in names}
        for name, result in zip(names, results):
            if result.boxes is None or result.keypoints is None:
                continue
            keypoints = result.keypoints.data.cpu().numpy()
            for i in range(len(result.boxes)):
                x1, y1, x2, y2 = (int(v) for v in result.boxes.xyxy[i].tolist())
                poses[name].append(PersonPose((x1, y1, x2, y2), float(result.boxes.conf[i]), keypoints[i]))
        return poses


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return float(np.hypot(a[0] - b[0], a[1] - b[1]))


def match_people(previous: list[PersonPose], current: list[PersonPose]) -> list[tuple[PersonPose, PersonPose]]:
    """(previous, current) pairs of the same person, greedily by distance
    between box centres. Scaled by the taller box, so someone who falls
    (and whose box gets much shorter) still matches."""
    candidates = sorted(
        (
            (_distance(p.center, c.center) / max(p.height, c.height), i, j)
            for i, p in enumerate(previous)
            for j, c in enumerate(current)
        ),
    )
    used_prev: set[int] = set()
    used_cur: set[int] = set()
    pairs = []
    for distance, i, j in candidates:
        if distance > MATCH_DISTANCE or i in used_prev or j in used_cur:
            continue
        used_prev.add(i)
        used_cur.add(j)
        pairs.append((previous[i], current[j]))
    return pairs


def wrist_speed(before: PersonPose, after: PersonPose, dt: float) -> float:
    """Fastest wrist movement in body heights per second (0 if no wrist
    was visible in both frames)."""
    if dt <= 0:
        return 0.0
    speeds = []
    for index in (LEFT_WRIST, RIGHT_WRIST):
        a, b = before.wrist(index), after.wrist(index)
        if a is not None and b is not None:
            speeds.append(_distance(a, b) / after.height / dt)
    return max(speeds, default=0.0)


def are_close(a: PersonPose, b: PersonPose, distance: float = settings.pose_close_distance) -> bool:
    """Boxes within `distance` x their mean width of each other, and of
    similar size (so roughly the same distance from the camera)."""
    if min(a.height, b.height) / max(a.height, b.height) < MIN_SCALE_RATIO:
        return False
    gap_x = max(0.0, max(a.bbox[0], b.bbox[0]) - min(a.bbox[2], b.bbox[2]))
    gap_y = max(0.0, max(a.bbox[1], b.bbox[1]) - min(a.bbox[3], b.bbox[3]))
    return max(gap_x, gap_y) <= distance * (a.width + b.width) / 2


@dataclass(frozen=True)
class PoseObservation:
    view: str
    # "strike" or "fall"
    reason: str
    # Frames with a signal among the last pose_window_frames, this view.
    hits: int
    confirmed: bool
    alarm_fired: bool
    people: int
    # The person the rule fired on.
    bbox: BBox


class AltercationAnalyzer:
    """Applies the strike/fall rules per view, frame to frame, and turns
    them into alarms: a view needs a signal in `consecutive_required` of
    its last `window_frames` frames, and alarms share one cooldown."""

    def __init__(
        self,
        strike_speed: float = settings.pose_strike_speed,
        close_distance: float = settings.pose_close_distance,
        consecutive_required: int = settings.pose_consecutive_required,
        window_frames: int = 5,
        cooldown_seconds: float = settings.pose_alarm_cooldown_seconds,
    ):
        self.strike_speed = strike_speed
        self.close_distance = close_distance
        self.consecutive_required = consecutive_required
        self.window_frames = max(window_frames, consecutive_required)
        self.cooldown_seconds = cooldown_seconds
        # Per view: the last frame's poses (for wrist speed) and the last
        # FALL_WINDOW_SECONDS of frames (for upright -> lying).
        self._previous: dict[str, tuple[float, list[PersonPose]]] = {}
        self._history: dict[str, collections.deque[tuple[float, list[PersonPose]]]] = {}
        self._recent: dict[str, collections.deque[bool]] = {}
        self._last_alarm_at: float | None = None

    def _signal(self, view: str, now: float, poses: list[PersonPose]) -> tuple[str, PersonPose] | None:
        previous = self._previous.get(view)
        history = self._history.setdefault(view, collections.deque())
        while history and now - history[0][0] > FALL_WINDOW_SECONDS:
            history.popleft()

        signal: tuple[str, PersonPose] | None = None
        if previous is not None:
            prev_time, prev_poses = previous
            for before, after in match_people(prev_poses, poses):
                others = [p for p in poses if p is not after]
                if wrist_speed(before, after, now - prev_time) >= self.strike_speed and any(
                    are_close(after, other, self.close_distance) for other in others
                ):
                    signal = ("strike", after)
                    break

        if signal is None:
            for person in poses:
                if person.height / person.width > LYING_RATIO:
                    continue
                # Lying now: was the same person upright within the window?
                for _, earlier in history:
                    for before, _after in match_people(earlier, [person]):
                        if before.height / before.width >= UPRIGHT_RATIO:
                            signal = ("fall", person)
                            break
                    if signal:
                        break
                if signal:
                    break

        history.append((now, poses))
        self._previous[view] = (now, poses)
        return signal

    def update(self, now: float, poses_by_view: dict[str, list[PersonPose]]) -> list[PoseObservation]:
        """Feed one frame. Views missing from poses_by_view count as
        frames without a signal (e.g. nobody in them)."""
        observations = []
        for view in set(self._recent) | set(poses_by_view):
            poses = poses_by_view.get(view, [])
            signal = self._signal(view, now, poses) if poses else None
            if not poses:
                self._previous.pop(view, None)
            recent = self._recent.setdefault(view, collections.deque(maxlen=self.window_frames))
            recent.append(signal is not None)
            if signal is None:
                continue

            reason, person = signal
            hits = sum(recent)
            confirmed = hits >= self.consecutive_required
            cooled_down = self._last_alarm_at is None or now - self._last_alarm_at > self.cooldown_seconds
            alarm_fired = confirmed and cooled_down
            if alarm_fired:
                self._last_alarm_at = now
            observations.append(
                PoseObservation(view, reason, hits, confirmed, alarm_fired, len(poses), person.bbox)
            )
        return observations


def load_pose_estimator() -> tuple[PoseEstimator | None, str | None]:
    """(estimator, None) or (None, reason) — the pipeline keeps running
    without pose analysis rather than failing to start."""
    if not settings.pose_enabled:
        return None, "disabled by POSE_ENABLED"
    try:
        return PoseEstimator(), None
    except Exception as exc:  # noqa: BLE001 — a missing model shouldn't stop weapon detection
        logger.exception("Failed to load pose model — altercation detection disabled")
        return None, f"failed to load: {exc}"
