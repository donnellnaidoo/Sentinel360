"""Per-frame orchestration, running in a background thread so the blocking
cv2 capture/inference loop doesn't block FastAPI's event loop.

Only wires capture -> detect/track -> overlay -> latest-frame-for-MJPEG for
now. Face/ALPR/weapon/altercation stages and the event-trigger + cooldown
logic that posts to the Node backend are added in later tasks — this is the
foundation they'll hook into (one detections list per frame, already
tagged with class + track_id).
"""

from __future__ import annotations

import logging
import threading
import time

import cv2
import numpy as np

from app.config import settings
from app.pipeline.capture import StreamCapture
from app.pipeline.detector import Detection, PersonVehicleDetector

logger = logging.getLogger(__name__)

_BOX_COLOR = {"person": (46, 204, 113), "vehicle": (52, 152, 219)}  # BGR


def _draw_overlays(image: np.ndarray, detections: list[Detection]) -> np.ndarray:
    annotated = image.copy()
    for det in detections:
        x1, y1, x2, y2 = det.bbox
        color = _BOX_COLOR.get(det.detection_class, (200, 200, 200))
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        label = f"{det.label} #{det.track_id}" if det.track_id is not None else det.label
        text = f"{label} {det.confidence:.2f}"
        cv2.putText(
            annotated, text, (x1, max(0, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2
        )
    return annotated


class PipelineRunner:
    """Owns the capture thread's lifecycle and the latest processed frame.

    `start`/`stop` are idempotent so repeated POST /stream/start calls (e.g.
    a flaky demo laptop restarting the pipeline) don't spawn duplicate
    capture threads.
    """

    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._latest_jpeg: bytes | None = None
        self._latest_detections: list[Detection] = []
        self._frame_count = 0
        self._started_at: float | None = None
        self._error: str | None = None

    @property
    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def status(self) -> dict:
        return {
            "running": self.is_running,
            "camera_id": settings.camera_id,
            "source": settings.stream_source,
            "frame_count": self._frame_count,
            "started_at": self._started_at,
            "error": self._error,
        }

    def latest_jpeg(self) -> bytes | None:
        with self._lock:
            return self._latest_jpeg

    def start(self) -> None:
        if self.is_running:
            return
        self._stop_event.clear()
        self._error = None
        self._started_at = time.time()
        self._thread = threading.Thread(target=self._run, name="pipeline-capture", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
        self._thread = None

    def _run(self) -> None:
        min_frame_interval = 1.0 / settings.target_fps
        detector = PersonVehicleDetector()

        try:
            with StreamCapture(settings.stream_source, loop=settings.stream_loop) as capture:
                while not self._stop_event.is_set():
                    loop_start = time.time()

                    frame = capture.read()
                    if frame is None:
                        # Non-looping file source reached its end.
                        break

                    detections = detector.track(frame.image)
                    annotated = _draw_overlays(frame.image, detections)
                    ok, buffer = cv2.imencode(".jpg", annotated)

                    with self._lock:
                        self._latest_detections = detections
                        self._frame_count += 1
                        if ok:
                            self._latest_jpeg = buffer.tobytes()

                    elapsed = time.time() - loop_start
                    remaining = min_frame_interval - elapsed
                    if remaining > 0:
                        time.sleep(remaining)
        except Exception as exc:  # noqa: BLE001 — surface via /stream/status rather than crash the thread silently
            logger.exception("Pipeline capture loop failed")
            self._error = str(exc)


runner = PipelineRunner()
