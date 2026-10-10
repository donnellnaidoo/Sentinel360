"""SlowFast anomaly detection, ported from the model team's
anomaly_detector.py (+ the confirmation logic from weapondetection.py).

EXPERIMENTAL: the model team's handoff says this binary UCF-Crime model is
NOT calibrated for the X3 domain — normal and staged activity overlap
heavily. Don't tune anomaly_threshold just to make a demo pass; use
settings.anomaly_enabled to switch it off instead.

Split like weapon.py:
  ClipBuffer              - which frames make up a clip (pure, no model)
  SlowFastAnomalyDetector - clip buffer + background inference thread
  AnomalyConfirmer        - pure streak / one-alarm-per-event logic

Two settings fix how clips are fed (both default to the original
behaviour; see config.py):
  anomaly_clip_seconds  32 frames spread over N seconds of real video,
                        instead of the last 32 processed frames (~6.4 s)
  anomaly_view_mode     score each X3 view on its own instead of the four
                        squashed into one 224x224 image
"""

from __future__ import annotations

import collections
import logging
import queue
import threading
from dataclasses import dataclass

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
from PIL import Image
from pytorchvideo.models.hub import slowfast_r50

from app.config import settings
from app.pipeline.capture import Frame
from app.pipeline.device import resolve_device
from app.pipeline.dewarp import ViewSplitter, compose_grid

logger = logging.getLogger(__name__)

# Must match the preprocessing used during training — don't change without
# retraining.
NUM_FRAMES = 32
SLOWFAST_ALPHA = 4
CROP_SIZE = 224
NORM_MEAN = [0.45, 0.45, 0.45]
NORM_STD = [0.225, 0.225, 0.225]

# Training manifest: 0 = NormalVideos, 1 = every anomaly category.
ANOMALY_CLASS_INDEX = 1

VIEW_MODES = ("composite", "per_view", "per_view_people")
# Clip key for the single composite image (composite mode).
COMPOSITE = "composite"
SLOWFAST_CELL_SIZE = (CROP_SIZE, CROP_SIZE)
# A timed clip needs this many distinct frames covering most of the window;
# otherwise the source is too slow to give SlowFast any real motion.
MIN_DISTINCT_FRAMES = NUM_FRAMES // 4
MIN_WINDOW_COVERAGE = 0.8


@dataclass(frozen=True)
class AnomalyResult:
    probability: float
    label: int
    # Highest-scoring view (per-view modes); None for the composite.
    view: str | None = None
    per_view: dict[str, float] | None = None


ClipFrame = dict[str, np.ndarray]


def clip_frame(views: dict[str, np.ndarray], view_mode: str) -> ClipFrame:
    """What one captured frame contributes to a clip: the 2x2 composite of
    224x224 cells (or a copy of the single view) in composite mode, or each
    view at 224x224 in the per-view modes. Always new arrays, so the
    inference thread can read them while the caller draws on the views."""
    if view_mode == "composite":
        image = (
            compose_grid(views, cell_size=SLOWFAST_CELL_SIZE) if len(views) > 1 else next(iter(views.values())).copy()
        )
        return {COMPOSITE: image}
    return {name: cv2.resize(image, SLOWFAST_CELL_SIZE, interpolation=cv2.INTER_AREA) for name, image in views.items()}


class ClipBuffer:
    """Frames for the next SlowFast clip. Thread-safe: a capture thread may
    add frames while the pipeline thread takes clips.

    clip_seconds == 0: the last NUM_FRAMES frames added, however long they
    span (the original behaviour).
    clip_seconds > 0: frames from the last clip_seconds of video, kept at
    most every clip_seconds / NUM_FRAMES (no point storing more), sampled
    to NUM_FRAMES evenly in time.
    """

    def __init__(self, clip_seconds: float = 0.0, num_frames: int = NUM_FRAMES):
        self.clip_seconds = clip_seconds
        self.num_frames = num_frames
        self._min_interval = clip_seconds / num_frames if clip_seconds > 0 else 0.0
        self._frames: collections.deque[tuple[float, ClipFrame]] = collections.deque(
            maxlen=num_frames * 2 if clip_seconds > 0 else num_frames
        )
        self._lock = threading.Lock()

    def add(self, timestamp: float, frame: ClipFrame) -> None:
        with self._lock:
            if self._frames and self.clip_seconds > 0:
                last = self._frames[-1][0]
                if timestamp < last:
                    # A looping file restarted: the old frames aren't before these.
                    self._frames.clear()
                elif timestamp - last < self._min_interval:
                    return
            self._frames.append((timestamp, frame))

    def wants(self, timestamp: float) -> bool:
        """False if add() would skip a frame at this time — lets a caller
        avoid preparing frames that would be thrown away."""
        with self._lock:
            if not self._frames or self.clip_seconds <= 0:
                return True
            last = self._frames[-1][0]
            return timestamp < last or timestamp - last >= self._min_interval

    def clip(self) -> list[ClipFrame] | None:
        """NUM_FRAMES frames, or None if there isn't enough video yet."""
        with self._lock:
            frames = list(self._frames)
        if self.clip_seconds <= 0:
            return [frame for _, frame in frames] if len(frames) == self.num_frames else None

        if not frames:
            return None
        newest = frames[-1][0]
        recent = [(ts, frame) for ts, frame in frames if ts >= newest - self.clip_seconds]
        span = newest - recent[0][0]
        if len(recent) < MIN_DISTINCT_FRAMES or span < self.clip_seconds * MIN_WINDOW_COVERAGE:
            return None
        # Evenly spaced in time: for each target time, the latest frame at or before it.
        times = np.array([ts for ts, _ in recent])
        targets = np.linspace(recent[0][0], newest, self.num_frames)
        indices = np.searchsorted(times, targets, side="right") - 1
        return [recent[max(0, int(i))][1] for i in indices]

    def __len__(self) -> int:
        with self._lock:
            return len(self._frames)


class SlowFastAnomalyDetector:
    """Keeps a clip buffer (ClipBuffer) and periodically scores it on a
    background thread, so the capture loop never waits on the model.

    Contract (from the model team — do not change): update() returns a
    result ONLY when a fresh inference has just completed, never the same
    result twice. `last_result` is for display only; alarm logic must act
    on update()'s return value.

    Frames come either from update() (the processed frames) or, when a
    capture tap is attached (attach_feed), from every frame the camera
    delivers via feed(); update() then only triggers scoring.
    """

    def __init__(
        self,
        checkpoint_path: str = settings.slowfast_model_path,
        device: str = settings.anomaly_device,
        inference_stride: int = settings.anomaly_inference_stride,
        clip_seconds: float = settings.anomaly_clip_seconds,
        view_mode: str = settings.anomaly_view_mode,
    ):
        if view_mode not in VIEW_MODES:
            raise ValueError(f"anomaly_view_mode must be one of {VIEW_MODES}, got {view_mode!r}")
        self.device = resolve_device(device)
        self.inference_stride = inference_stride
        self.view_mode = view_mode
        self.model = self._build_model(checkpoint_path)
        self.model.eval()

        # Composite mode: resize the WHOLE 2x2 composite to 224x224 (no
        # center crop) so all four views stay in the clip — a Front-only
        # crop experiment gave strong false positives. Per-view frames are
        # already 224x224.
        self.frame_transform = T.Compose(
            [
                T.Resize((CROP_SIZE, CROP_SIZE)),
                T.ToTensor(),
                T.Normalize(mean=NORM_MEAN, std=NORM_STD),
            ]
        )

        self.clips = ClipBuffer(clip_seconds)
        self.external_feed = False
        # Only touched from the capture thread that calls feed().
        self._feed_splitter: ViewSplitter | None = None
        self._frame_counter = 0
        self.last_result: AnomalyResult | None = None
        self.last_error: str | None = None

        self._work: queue.Queue[tuple[list[ClipFrame], list[str] | None]] = queue.Queue(maxsize=1)
        self._results: queue.Queue[AnomalyResult] = queue.Queue()
        self._busy = False
        self._stop_event = threading.Event()
        self._worker = threading.Thread(target=self._worker_loop, name="slowfast-worker", daemon=True)
        self._worker.start()

    @property
    def clip_seconds(self) -> float:
        return self.clips.clip_seconds

    def _build_model(self, checkpoint_path: str) -> nn.Module:
        # Built from the locally installed pytorchvideo rather than
        # torch.hub.load(...), so startup needs no network access.
        model = slowfast_r50(pretrained=False)
        model.blocks[-1].proj = nn.Linear(model.blocks[-1].proj.in_features, 2)

        state_dict = torch.load(checkpoint_path, map_location="cpu")
        # Some notebooks save {"model_state_dict": ...} instead of the raw state dict.
        if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
            state_dict = state_dict["model_state_dict"]
        model.load_state_dict(state_dict)
        return model.to(self.device)

    def _pathways(self, frames_bgr: list[np.ndarray]) -> tuple[torch.Tensor, torch.Tensor]:
        processed = [self.frame_transform(Image.fromarray(frame[:, :, ::-1])) for frame in frames_bgr]

        # (T, C, H, W) -> (C, T, H, W)
        fast_pathway = torch.stack(processed, dim=0).permute(1, 0, 2, 3)
        slow_indices = torch.linspace(0, fast_pathway.shape[1] - 1, fast_pathway.shape[1] // SLOWFAST_ALPHA).long()
        slow_pathway = torch.index_select(fast_pathway, 1, slow_indices)
        return slow_pathway, fast_pathway

    def _preprocess_clip(self, frames_bgr: list[np.ndarray]) -> list[torch.Tensor]:
        slow_pathway, fast_pathway = self._pathways(frames_bgr)
        # A fresh list every call: pytorchvideo's multipathway stem replaces
        # the list's elements in place during forward().
        return [slow_pathway.unsqueeze(0).to(self.device), fast_pathway.unsqueeze(0).to(self.device)]

    def score(self, clip: list[ClipFrame], views: list[str] | None = None) -> AnomalyResult:
        """Scores one clip synchronously (the worker thread calls this;
        scripts/evaluate.py calls it directly). `views` limits which views
        are scored in the per-view modes; empty = nothing to score (p = 0)."""
        names = list(clip[0]) if views is None else [name for name in clip[0] if name in views]
        if not names:
            return AnomalyResult(probability=0.0, label=0, per_view={})

        # One batch: every view's clip through the model together.
        pathways = [self._pathways([frame[name] for frame in clip]) for name in names]
        inputs = [
            torch.stack([slow for slow, _ in pathways]).to(self.device),
            torch.stack([fast for _, fast in pathways]).to(self.device),
        ]
        with torch.no_grad():
            probs = F.softmax(self.model(inputs), dim=1)

        scores = {name: probs[i, ANOMALY_CLASS_INDEX].item() for i, name in enumerate(names)}
        best = max(scores, key=scores.__getitem__)
        return AnomalyResult(
            probability=scores[best],
            label=int(torch.argmax(probs[names.index(best)]).item()),
            view=None if best == COMPOSITE else best,
            per_view=None if best == COMPOSITE else scores,
        )

    def _infer(self, frames: list[np.ndarray]) -> AnomalyResult:
        """Scores a plain list of frames (the original single-clip path)."""
        indices = np.linspace(0, len(frames) - 1, NUM_FRAMES).astype(int).tolist()
        return self.score([{COMPOSITE: frames[i]} for i in indices])

    def _worker_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                clip, views = self._work.get(timeout=0.2)
            except queue.Empty:
                continue
            try:
                result = self.score(clip, views)
            except Exception as exc:  # noqa: BLE001 — keep the worker alive if one pass fails
                logger.exception("SlowFast inference failed")
                self.last_error = str(exc)
                self._busy = False
                continue
            self.last_result = result
            self._results.put(result)
            self._busy = False

    def attach_feed(self) -> None:
        """From now on frames arrive through feed() (a capture tap), and
        update() stops adding the processed frames."""
        self.external_feed = True

    def feed(self, frame: Frame) -> None:
        """Capture-thread tap: called for every frame the camera delivers.
        Only frames the clip buffer will keep are dewarped."""
        if not self.clips.wants(frame.timestamp):
            return
        if self._feed_splitter is None:
            self._feed_splitter = ViewSplitter()
        self.clips.add(frame.timestamp, clip_frame(self._feed_splitter.split(frame), self.view_mode))

    def update(
        self,
        views: dict[str, np.ndarray],
        timestamp: float,
        people_views: set[str] | None = None,
    ) -> AnomalyResult | None:
        """Call once per processed frame. Never blocks on the model.
        `people_views` (views with a person in them) is used by
        per_view_people mode."""
        if not self.external_feed and self.clips.wants(timestamp):
            self.clips.add(timestamp, clip_frame(views, self.view_mode))
        self._frame_counter += 1

        # Skip this attempt if the worker is still busy rather than queueing
        # stale clips behind it.
        if self._frame_counter % self.inference_stride == 0 and not self._busy:
            clip = self.clips.clip()
            if clip is not None:
                score_views = sorted(people_views or ()) if self.view_mode == "per_view_people" else None
                self._busy = True
                self._work.put_nowait((clip, score_views))

        try:
            return self._results.get_nowait()
        except queue.Empty:
            return None

    def close(self) -> None:
        self._stop_event.set()
        self._worker.join(timeout=2.0)


@dataclass(frozen=True)
class AnomalyObservation:
    """One fresh SlowFast result after confirmation. Mirrors an
    anomaly_log.csv row."""

    probability: float
    label: int
    streak: int
    confirmed: bool
    alarm_fired: bool
    # Highest-scoring view in the per-view modes.
    view: str | None = None


class AnomalyConfirmer:
    """Requires `consecutive_required` fresh results at/above `threshold`.
    One continuous confirmed anomaly fires exactly one alarm; it re-arms
    once a result drops below the threshold.
    """

    def __init__(
        self,
        threshold: float = settings.anomaly_threshold,
        consecutive_required: int = settings.anomaly_consecutive_required,
    ):
        self.threshold = threshold
        self.consecutive_required = consecutive_required
        self.streak = 0
        self.event_active = False

    def update(self, result: AnomalyResult) -> AnomalyObservation:
        if result.probability >= self.threshold:
            self.streak += 1
        else:
            self.streak = 0
            self.event_active = False

        confirmed = self.streak >= self.consecutive_required
        alarm_fired = confirmed and not self.event_active
        if alarm_fired:
            self.event_active = True

        return AnomalyObservation(
            probability=result.probability,
            label=result.label,
            streak=self.streak,
            confirmed=confirmed,
            alarm_fired=alarm_fired,
            view=result.view,
        )
