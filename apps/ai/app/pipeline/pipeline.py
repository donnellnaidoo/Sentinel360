"""Per-frame orchestration, running in a background thread so the blocking
cv2 capture/inference loop doesn't block FastAPI's event loop.

capture -> views (X3 dewarp or single view) -> batched YOLO (person/knife)
-> KnifeConfirmer -> SlowFast clip buffer (background thread)
-> AnomalyConfirmer -> overlays -> latest JPEG for MJPEG
-> confirmed detections onto the EventQueue for the backend publisher.

Overlays are drawn on copies only: the raw views must stay clean because
the evidence crops and the SlowFast input are taken from them.
"""

from __future__ import annotations

import collections
import logging
import threading
import time
from collections.abc import Callable

import cv2
import numpy as np

from app.config import settings
from app.pipeline.anomaly import AnomalyConfirmer, AnomalyObservation, SlowFastAnomalyDetector
from app.pipeline.capture import Frame, FrameSource, open_capture
from app.pipeline.dewarp import ViewSplitter, compose_grid
from app.pipeline.events import DetectionEvent, EventQueue
from app.pipeline.weapon import (
    KnifeConfirmer,
    KnifeObservation,
    ViewDetection,
    WeaponDetector,
    best_knife_per_view,
    crop_with_padding,
)

logger = logging.getLogger(__name__)

# BGR
_PERSON_COLOR = (46, 204, 113)
_KNIFE_COLOR = (0, 0, 255)
_NORMAL_COLOR = (0, 200, 0)
_TEXT_COLOR = (255, 255, 255)

SLOWFAST_CELL_SIZE = (224, 224)
ALARM_BANNER_SECONDS = 3.0
WEAPON_MODEL_NAME = "yolov8n-coco"
ANOMALY_MODEL_NAME = "slowfast_r50-ucfcrime-binary"


def _label(image: np.ndarray, text: str, origin: tuple[int, int], color: tuple[int, int, int]) -> None:
    (w, h), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    x, y = origin
    y = max(h + baseline, y)
    cv2.rectangle(image, (x, y - h - baseline), (x + w + 4, y + 2), color, -1)
    cv2.putText(image, text, (x + 2, y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.5, _TEXT_COLOR, 1, cv2.LINE_AA)


def _draw_view(
    raw: np.ndarray,
    view: str,
    detections: list[ViewDetection],
    knife: KnifeObservation | None,
    show_view_name: bool,
) -> np.ndarray:
    annotated = raw.copy()
    for det in detections:
        x1, y1, x2, y2 = det.bbox
        color = _KNIFE_COLOR if det.label == "knife" else _PERSON_COLOR
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        _label(annotated, f"{det.label} {det.confidence:.2f}", (x1, y1 - 4), color)

    if knife is not None and knife.confirmed:
        x1, y1, x2, y2 = knife.bbox
        cv2.rectangle(annotated, (x1 - 3, y1 - 3), (x2 + 3, y2 + 3), _KNIFE_COLOR, 4)

    if show_view_name:
        _label(annotated, view, (10, 24), (40, 40, 40))
    return annotated


def _encode_jpeg(image: np.ndarray | None) -> bytes | None:
    if image is None:
        return None
    ok, buffer = cv2.imencode(".jpg", image)
    return buffer.tobytes() if ok else None


class FrameProcessor:
    """Everything that happens to one captured frame. Owns the stateful
    confirmers, so one instance per pipeline run.
    """

    def __init__(
        self,
        weapon_detector: WeaponDetector,
        anomaly_detector: SlowFastAnomalyDetector | None,
        emit: Callable[[DetectionEvent], None],
        camera_id: str = settings.camera_id,
    ):
        self.weapon_detector = weapon_detector
        self.anomaly_detector = anomaly_detector
        self.emit = emit
        self.camera_id = camera_id
        self.splitter = ViewSplitter()
        self.knife_confirmer = KnifeConfirmer()
        self.anomaly_confirmer = AnomalyConfirmer()
        self.last_anomaly: AnomalyObservation | None = None
        self._alarm_until = 0.0

    def process(self, frame: Frame) -> np.ndarray:
        views = self.splitter.split(frame)
        multi_view = len(views) > 1

        detections = self.weapon_detector.detect(views)
        knife_observations = self.knife_confirmer.update(best_knife_per_view(detections), now=frame.timestamp)
        knife_by_view = {obs.view: obs for obs in knife_observations}

        display = compose_grid(
            {
                name: _draw_view(raw, name, detections[name], knife_by_view.get(name), multi_view)
                for name, raw in views.items()
            }
        )

        anomaly_fired = self._update_anomaly(views, multi_view)
        fired_knives = [obs for obs in knife_observations if obs.alarm_fired]
        if fired_knives or anomaly_fired is not None:
            self._alarm_until = frame.timestamp + ALARM_BANNER_SECONDS

        self._draw_status(display, frame.timestamp)

        if fired_knives or anomaly_fired is not None:
            snapshot = _encode_jpeg(display)
            for obs in fired_knives:
                self._emit_weapon(obs, views[obs.view], snapshot, multi_view)
            if anomaly_fired is not None:
                self._emit_anomaly(anomaly_fired, snapshot)

        return display

    def _update_anomaly(self, views: dict[str, np.ndarray], multi_view: bool) -> AnomalyObservation | None:
        """Feeds SlowFast; returns the observation only if it fired an alarm."""
        if self.anomaly_detector is None:
            return None

        # Clean input: a fresh 2x2 composite of raw views (X3), or a copy
        # of the single raw view.
        clip_frame = compose_grid(views, cell_size=SLOWFAST_CELL_SIZE) if multi_view else next(iter(views.values())).copy()
        result = self.anomaly_detector.update(clip_frame)
        if result is None:
            return None

        observation = self.anomaly_confirmer.update(result)
        self.last_anomaly = observation
        logger.debug(
            "anomaly p=%.4f streak=%d confirmed=%s fired=%s",
            observation.probability,
            observation.streak,
            observation.confirmed,
            observation.alarm_fired,
        )
        return observation if observation.alarm_fired else None

    def _draw_status(self, display: np.ndarray, now: float) -> None:
        if self.anomaly_detector is not None and self.anomaly_detector.last_result is not None:
            probability = self.anomaly_detector.last_result.probability
            color = _KNIFE_COLOR if probability >= self.anomaly_confirmer.threshold else _NORMAL_COLOR
            _label(display, f"Anomaly (experimental): {probability:.2f}", (10, display.shape[0] - 12), color)

        if now < self._alarm_until:
            cv2.rectangle(display, (0, 0), (display.shape[1] - 1, display.shape[0] - 1), _KNIFE_COLOR, 6)

    def _emit_weapon(self, obs: KnifeObservation, raw_view: np.ndarray, snapshot: bytes | None, multi_view: bool) -> None:
        where = f" in {obs.view} view" if multi_view else ""
        logger.warning(
            "Confirmed knife%s conf=%.2f bbox=%s [%s]", where, obs.confidence, obs.bbox, obs.confirmation_method
        )
        event = DetectionEvent(
            event_type="WEAPON_DETECTED",
            camera_id=self.camera_id,
            confidence=obs.confidence,
            summary=f"Knife detected{where} — camera {self.camera_id}",
            metadata={
                "view": obs.view,
                "bbox": list(obs.bbox),
                "confirmationMethod": obs.confirmation_method,
                "streak": obs.streak,
                "model": WEAPON_MODEL_NAME,
            },
            snapshot_jpeg=snapshot,
            crop_jpeg=_encode_jpeg(crop_with_padding(raw_view, obs.bbox)),
        )
        self.emit(event)

    def _emit_anomaly(self, obs: AnomalyObservation, snapshot: bytes | None) -> None:
        logger.warning(
            "Confirmed anomalous activity p=%.2f [%d-result persistence]", obs.probability, obs.streak
        )
        event = DetectionEvent(
            event_type="ANOMALY_DETECTED",
            camera_id=self.camera_id,
            confidence=obs.probability,
            summary=f"Possible anomalous activity — camera {self.camera_id}",
            metadata={
                "streak": obs.streak,
                "threshold": self.anomaly_confirmer.threshold,
                "model": ANOMALY_MODEL_NAME,
                # Model team: not calibrated for X3 footage. Surfaced in the
                # UI so investigators weigh these alerts accordingly.
                "modelStatus": "experimental",
            },
            snapshot_jpeg=snapshot,
        )
        self.emit(event)


def load_anomaly_detector() -> tuple[SlowFastAnomalyDetector | None, str | None]:
    """(detector, None) or (None, reason) — the pipeline keeps running
    without anomaly detection rather than failing to start."""
    if not settings.anomaly_enabled:
        return None, "disabled by ANOMALY_ENABLED"
    try:
        return SlowFastAnomalyDetector(), None
    except Exception as exc:  # noqa: BLE001 — missing/corrupt checkpoint shouldn't stop weapon detection
        logger.exception("Failed to load SlowFast model — anomaly detection disabled")
        return None, f"failed to load: {exc}"


class PipelineRunner:
    """Owns the capture thread's lifecycle, the latest processed frame and
    the outgoing event queue.

    `start`/`stop` are idempotent so repeated POST /stream/start calls (e.g.
    a flaky demo laptop restarting the pipeline) don't spawn duplicate
    capture threads.
    """

    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._latest_jpeg: bytes | None = None
        self._frame_count = 0
        self._fps = 0.0
        self._started_at: float | None = None
        self._error: str | None = None
        self._processor: FrameProcessor | None = None
        self._anomaly_unavailable: str | None = None
        self._capture: FrameSource | None = None
        # Outlives individual runs so the publisher can keep draining it.
        self.events = EventQueue(maxsize=settings.event_queue_size)
        self._recent_events: collections.deque[dict] = collections.deque(maxlen=20)

    @property
    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def status(self) -> dict:
        processor = self._processor
        anomaly: dict = {"enabled": False, "reason": self._anomaly_unavailable}
        if processor is not None and processor.anomaly_detector is not None:
            detector = processor.anomaly_detector
            last = processor.last_anomaly
            anomaly = {
                "enabled": True,
                "device": detector.device,
                "threshold": processor.anomaly_confirmer.threshold,
                "last_probability": round(last.probability, 4) if last else None,
                "streak": processor.anomaly_confirmer.streak,
                "event_active": processor.anomaly_confirmer.event_active,
                "last_error": detector.last_error,
            }

        return {
            "running": self.is_running,
            "camera_id": settings.camera_id,
            "source": settings.stream_source,
            "frame_count": self._frame_count,
            "fps": round(self._fps, 2),
            "started_at": self._started_at,
            "error": self._error,
            # Set while the camera/stitcher isn't delivering frames (the
            # pipeline keeps retrying rather than failing).
            "source_warning": self._capture.last_error if self._capture and self.is_running else None,
            "knife_streaks": dict(processor.knife_confirmer.streaks) if processor else {},
            "anomaly": anomaly,
            "events": {
                "queued": self.events.qsize(),
                "dropped": self.events.dropped,
                "recent": list(self._recent_events),
            },
        }

    def latest_jpeg(self) -> bytes | None:
        with self._lock:
            return self._latest_jpeg

    def start(self) -> None:
        if self.is_running:
            return
        # A fresh event per run: a previous run still stuck waiting on a
        # camera keeps its own (set) event and exits, instead of being
        # revived when this one clears it.
        self._stop_event = threading.Event()
        self._error = None
        self._started_at = time.time()
        self._thread = threading.Thread(
            target=self._run, args=(self._stop_event,), name="pipeline-capture", daemon=True
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
        self._thread = None

    def _record_event(self, event: DetectionEvent) -> None:
        self._recent_events.appendleft(event.describe())
        self.events.put(event)

    def _run(self, stop_event: threading.Event) -> None:
        min_frame_interval = 1.0 / settings.target_fps
        anomaly_detector: SlowFastAnomalyDetector | None = None

        try:
            weapon_detector = WeaponDetector()
            anomaly_detector, self._anomaly_unavailable = load_anomaly_detector()
            self._processor = FrameProcessor(weapon_detector, anomaly_detector, emit=self._record_event)

            with open_capture(settings.stream_source, loop=settings.stream_loop, stop_event=stop_event) as capture:
                self._capture = capture
                last_frame_at = time.time()
                while not stop_event.is_set():
                    loop_start = time.time()

                    frame = capture.read()
                    if frame is None:
                        # Stopped, or a non-looping file source reached its end.
                        break

                    display = self._processor.process(frame)
                    jpeg = _encode_jpeg(display)

                    with self._lock:
                        self._frame_count += 1
                        if jpeg is not None:
                            self._latest_jpeg = jpeg

                    now = time.time()
                    self._fps = 1.0 / max(now - last_frame_at, 1e-6)
                    last_frame_at = now

                    remaining = min_frame_interval - (time.time() - loop_start)
                    if remaining > 0:
                        time.sleep(remaining)
        except Exception as exc:  # noqa: BLE001 — surface via /stream/status rather than crash the thread silently
            logger.exception("Pipeline capture loop failed")
            self._error = str(exc)
        finally:
            if anomaly_detector is not None:
                anomaly_detector.close()


runner = PipelineRunner()
