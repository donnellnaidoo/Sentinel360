"""SlowFast anomaly detection, ported from the model team's
anomaly_detector.py (+ the confirmation logic from weapondetection.py).

EXPERIMENTAL: the model team's handoff says this binary UCF-Crime model is
NOT calibrated for the X3 domain — normal and staged activity overlap
heavily. Don't tune anomaly_threshold just to make a demo pass; use
settings.anomaly_enabled to switch it off instead.

Split in two like weapon.py:
  SlowFastAnomalyDetector - rolling clip buffer + background inference thread
  AnomalyConfirmer        - pure streak / one-alarm-per-event logic
"""

from __future__ import annotations

import collections
import logging
import queue
import threading
from dataclasses import dataclass

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
from PIL import Image
from pytorchvideo.models.hub import slowfast_r50

from app.config import settings
from app.pipeline.device import resolve_device

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


@dataclass(frozen=True)
class AnomalyResult:
    probability: float
    label: int


class SlowFastAnomalyDetector:
    """Keeps a rolling buffer of the last NUM_FRAMES frames and periodically
    scores it on a background thread, so the capture loop never waits on
    the model.

    Contract (from the model team — do not change): update() returns a
    result ONLY when a fresh inference has just completed, never the same
    result twice. `last_result` is for display only; alarm logic must act
    on update()'s return value.

    Pass frames that won't be modified afterwards (a clean copy made before
    any overlays are drawn): the worker reads them from another thread.
    """

    def __init__(
        self,
        checkpoint_path: str = settings.slowfast_model_path,
        device: str = settings.anomaly_device,
        inference_stride: int = settings.anomaly_inference_stride,
    ):
        self.device = resolve_device(device)
        self.inference_stride = inference_stride
        self.model = self._build_model(checkpoint_path)
        self.model.eval()

        # The X3 pipeline feeds a 2x2 four-view composite. Resize the WHOLE
        # composite to 224x224 (no center crop) so all four views stay in
        # the clip — a Front-only crop experiment gave strong false positives.
        self.frame_transform = T.Compose(
            [
                T.Resize((CROP_SIZE, CROP_SIZE)),
                T.ToTensor(),
                T.Normalize(mean=NORM_MEAN, std=NORM_STD),
            ]
        )

        self.buffer: collections.deque[np.ndarray] = collections.deque(maxlen=NUM_FRAMES)
        self._frame_counter = 0
        self.last_result: AnomalyResult | None = None
        self.last_error: str | None = None

        self._work: queue.Queue[list[np.ndarray]] = queue.Queue(maxsize=1)
        self._results: queue.Queue[AnomalyResult] = queue.Queue()
        self._busy = False
        self._stop_event = threading.Event()
        self._worker = threading.Thread(target=self._worker_loop, name="slowfast-worker", daemon=True)
        self._worker.start()

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

    def _preprocess_clip(self, frames_bgr: list[np.ndarray]) -> list[torch.Tensor]:
        processed = [self.frame_transform(Image.fromarray(frame[:, :, ::-1])) for frame in frames_bgr]

        # (T, C, H, W) -> (C, T, H, W)
        fast_pathway = torch.stack(processed, dim=0).permute(1, 0, 2, 3)
        slow_indices = torch.linspace(0, fast_pathway.shape[1] - 1, fast_pathway.shape[1] // SLOWFAST_ALPHA).long()
        slow_pathway = torch.index_select(fast_pathway, 1, slow_indices)

        # A fresh list every call: pytorchvideo's multipathway stem replaces
        # the list's elements in place during forward().
        return [slow_pathway.unsqueeze(0).to(self.device), fast_pathway.unsqueeze(0).to(self.device)]

    def _infer(self, frames: list[np.ndarray]) -> AnomalyResult:
        indices = np.linspace(0, len(frames) - 1, NUM_FRAMES).astype(int).tolist()
        inputs = self._preprocess_clip([frames[i] for i in indices])

        with torch.no_grad():
            probs = F.softmax(self.model(inputs), dim=1)[0]
        return AnomalyResult(
            probability=probs[ANOMALY_CLASS_INDEX].item(),
            label=int(torch.argmax(probs).item()),
        )

    def _worker_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                frames = self._work.get(timeout=0.2)
            except queue.Empty:
                continue
            try:
                result = self._infer(frames)
            except Exception as exc:  # noqa: BLE001 — keep the worker alive if one pass fails
                logger.exception("SlowFast inference failed")
                self.last_error = str(exc)
                self._busy = False
                continue
            self.last_result = result
            self._results.put(result)
            self._busy = False

    def update(self, frame_bgr: np.ndarray) -> AnomalyResult | None:
        """Call once per processed frame. Never blocks on the model."""
        self.buffer.append(frame_bgr)
        self._frame_counter += 1

        buffer_full = len(self.buffer) == NUM_FRAMES
        time_to_infer = self._frame_counter % self.inference_stride == 0

        # Skip this attempt if the worker is still busy rather than queueing
        # stale clips behind it.
        if buffer_full and time_to_infer and not self._busy:
            self._busy = True
            self._work.put_nowait(list(self.buffer))

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
        )
