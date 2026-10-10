"""Per-frame orchestration, running in a background thread so the blocking
cv2 capture/inference loop doesn't block FastAPI's event loop.

capture -> views (X3 dewarp or single view) -> batched YOLO (person/weapon)
-> KnifeConfirmer -> [pose rules] -> SlowFast clip buffer (background
thread) -> AnomalyConfirmer -> overlays -> latest JPEG for MJPEG
-> confirmed detections (plus face crops from that frame, and any
watchlist suggestions) onto the EventQueue for the backend publisher.
Stages in [] and watchlist matching are off unless enabled in config.py.

Overlays are drawn on copies only: the raw views must stay clean because
the evidence crops and the SlowFast input are taken from them.
"""

from __future__ import annotations

import collections
import logging
import threading
import time
from collections.abc import Callable
from datetime import datetime, timezone

import cv2
import numpy as np

from app.config import settings
from app.pipeline.anomaly import AnomalyConfirmer, AnomalyObservation, SlowFastAnomalyDetector
from app.pipeline.capture import Frame, FrameSource, is_live_source, open_capture
from app.pipeline.dewarp import ViewSplitter, compose_grid
from app.pipeline.events import DetectionEvent, EventQueue
from app.pipeline.faces import YUNET_MODEL_NAME, FaceCrop, FaceDetector, load_face_detector
from app.pipeline.pose import AltercationAnalyzer, PoseEstimator, PoseObservation, load_pose_estimator
from app.pipeline.watchlist import SFACE_MODEL_NAME, WatchlistMatcher, load_watchlist_matcher
from app.pipeline.weapon import (
    KnifeConfirmer,
    KnifeObservation,
    ViewDetection,
    PERSON_LABEL,
    WeaponDetector,
    best_knife_per_view,
    crop_with_padding,
)

logger = logging.getLogger(__name__)

# BGR
_PERSON_COLOR = (46, 204, 113)
_KNIFE_COLOR = (0, 0, 255)
_POSE_COLOR = (0, 140, 255)
_NORMAL_COLOR = (0, 200, 0)
_TEXT_COLOR = (255, 255, 255)

ALARM_BANNER_SECONDS = 3.0
ANOMALY_MODEL_NAME = "slowfast_r50-ucfcrime-binary"


class PanicCaptureError(Exception):
    pass


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
    pose: PoseObservation | None = None,
) -> np.ndarray:
    annotated = raw.copy()
    for det in detections:
        x1, y1, x2, y2 = det.bbox
        color = _PERSON_COLOR if det.label == PERSON_LABEL else _KNIFE_COLOR
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        _label(annotated, f"{det.label} {det.confidence:.2f}", (x1, y1 - 4), color)

    if knife is not None and knife.confirmed:
        x1, y1, x2, y2 = knife.bbox
        cv2.rectangle(annotated, (x1 - 3, y1 - 3), (x2 + 3, y2 + 3), _KNIFE_COLOR, 4)

    if pose is not None and pose.confirmed:
        x1, y1, x2, y2 = pose.bbox
        cv2.rectangle(annotated, (x1, y1), (x2, y2), _POSE_COLOR, 3)
        _label(annotated, f"{pose.reason} (experimental)", (x1, y2 + 16), _POSE_COLOR)

    if show_view_name:
        _label(annotated, view, (10, 24), (40, 40, 40))
    return annotated


def _encode_jpeg(image: np.ndarray | None) -> bytes | None:
    if image is None:
        return None
    ok, buffer = cv2.imencode(".jpg", image)
    return buffer.tobytes() if ok else None


def _set_faces(event: DetectionEvent, crops: list[FaceCrop], watchlist: WatchlistMatcher | None, views) -> None:
    event.face_jpegs = [crop.jpeg for crop in crops]
    faces = [{"view": crop.view, "bbox": list(crop.bbox), "confidence": round(crop.confidence, 4)} for crop in crops]
    event.metadata["faces"] = faces
    event.metadata["faceModel"] = YUNET_MODEL_NAME
    if watchlist is None or not crops:
        return

    # Suggestions only: an officer must confirm any identity.
    best: dict[str, dict] = {}
    for number, (face, matches) in enumerate(zip(faces, watchlist.match_crops(views, crops)), start=1):
        if not matches:
            continue
        face["watchlistMatches"] = [m.describe() for m in matches]
        for match in matches:
            current = best.get(match.entity_profile_id)
            if current is None or match.similarity > current["similarity"]:
                best[match.entity_profile_id] = {**match.describe(), "faceNumber": number}
    if best:
        event.metadata["watchlistMatches"] = sorted(best.values(), key=lambda m: -m["similarity"])
        event.metadata["watchlistReview"] = "required"
        event.metadata["faceMatchModel"] = SFACE_MODEL_NAME


def _attach_faces(
    event: DetectionEvent,
    detector: FaceDetector | None,
    views: dict[str, np.ndarray],
    watchlist: WatchlistMatcher | None = None,
) -> None:
    """Adds every face in the clean views to the event's evidence, with
    watchlist suggestions if matching is on."""
    if detector is None:
        return
    _set_faces(event, detector.crops(views), watchlist, views)


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
        face_detector: FaceDetector | None = None,
        pose_estimator: PoseEstimator | None = None,
        watchlist: WatchlistMatcher | None = None,
        *,
        watchlist_scan: bool = settings.face_watchlist_scan,
        scan_every_frames: int = settings.face_scan_every_frames,
        watchlist_cooldown_seconds: float = settings.watchlist_match_cooldown_seconds,
    ):
        self.weapon_detector = weapon_detector
        self.anomaly_detector = anomaly_detector
        self.face_detector = face_detector
        self.pose_estimator = pose_estimator
        self.watchlist = watchlist
        self.emit = emit
        self.camera_id = camera_id
        self.splitter = ViewSplitter()
        self.knife_confirmer = KnifeConfirmer()
        self.anomaly_confirmer = AnomalyConfirmer()
        self.pose_analyzer = AltercationAnalyzer()
        self.last_anomaly: AnomalyObservation | None = None
        self.last_pose: list[PoseObservation] = []
        self.watchlist_scan = watchlist_scan and watchlist is not None and face_detector is not None
        self.scan_every_frames = max(1, scan_every_frames)
        self.watchlist_cooldown_seconds = watchlist_cooldown_seconds
        self._last_watchlist_alert: dict[str, float] = {}
        self._frame_counter = 0
        self._alarm_until = 0.0
        # Unannotated views of the most recent frame, for the panic button.
        self.latest_views: dict[str, np.ndarray] | None = None

    def process(self, frame: Frame) -> np.ndarray:
        views = self.splitter.split(frame)
        multi_view = len(views) > 1
        self.latest_views = views

        detections = self.weapon_detector.detect(views)
        candidates = best_knife_per_view(detections, alarm_labels=self.weapon_detector.alarm_labels)
        knife_observations = self.knife_confirmer.update(candidates, now=frame.timestamp)
        knife_by_view = {obs.view: obs for obs in knife_observations}
        self._frame_counter += 1

        people_views = {name for name, dets in detections.items() if any(d.label == PERSON_LABEL for d in dets)}
        pose_observations = self._update_pose(views, frame.timestamp, people_views)
        pose_by_view = {obs.view: obs for obs in pose_observations}

        display = compose_grid(
            {
                name: _draw_view(
                    raw, name, detections[name], knife_by_view.get(name), multi_view, pose_by_view.get(name)
                )
                for name, raw in views.items()
            }
        )

        anomaly_fired = self._update_anomaly(views, frame.video_time, people_views)
        fired_knives = [obs for obs in knife_observations if obs.alarm_fired]
        fired_poses = [obs for obs in pose_observations if obs.alarm_fired]
        if fired_knives or anomaly_fired is not None or fired_poses:
            self._alarm_until = frame.timestamp + ALARM_BANNER_SECONDS

        self._draw_status(display, frame.timestamp)

        if fired_knives or anomaly_fired is not None or fired_poses:
            snapshot = _encode_jpeg(display)
            for obs in fired_knives:
                self._emit_weapon(obs, views, snapshot, multi_view)
            if anomaly_fired is not None:
                self._emit_anomaly(anomaly_fired, views, snapshot)
            for obs in fired_poses:
                self._emit_altercation(obs, views, snapshot, multi_view)

        if self.watchlist_scan and self._frame_counter % self.scan_every_frames == 0:
            self._scan_watchlist(views, display, frame.timestamp)

        return display

    def _update_pose(
        self, views: dict[str, np.ndarray], now: float, people_views: set[str]
    ) -> list[PoseObservation]:
        """Pose rules on the views with people in them (the weapon model
        already found the persons, so empty views cost nothing)."""
        if self.pose_estimator is None:
            return []
        poses = self.pose_estimator.estimate({name: views[name] for name in sorted(people_views)})
        self.last_pose = self.pose_analyzer.update(now, poses)
        return self.last_pose

    def _scan_watchlist(self, views: dict[str, np.ndarray], display: np.ndarray, now: float) -> None:
        """Looks for watchlisted faces on an ordinary frame; each new
        suggestion becomes a WATCHLIST_MATCH for an officer to verify."""
        assert self.face_detector is not None and self.watchlist is not None
        if not self.watchlist.people:
            return
        crops = self.face_detector.crops(views)
        if not crops:
            return
        snapshot: bytes | None = None
        for crop, matches in zip(crops, self.watchlist.match_crops(views, crops)):
            if not matches:
                continue
            top = matches[0]
            last = self._last_watchlist_alert.get(top.entity_profile_id)
            if last is not None and now - last < self.watchlist_cooldown_seconds:
                continue
            self._last_watchlist_alert[top.entity_profile_id] = now
            if snapshot is None:
                snapshot = _encode_jpeg(display)
            self._emit_watchlist(top, crop, views, snapshot, multi_view=len(views) > 1)

    def _update_anomaly(
        self, views: dict[str, np.ndarray], video_time: float, people_views: set[str]
    ) -> AnomalyObservation | None:
        """Feeds SlowFast; returns the observation only if it fired an alarm.
        The detector copies what it keeps from the clean views."""
        if self.anomaly_detector is None:
            return None

        result = self.anomaly_detector.update(views, video_time, people_views)
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

    def _emit_weapon(
        self, obs: KnifeObservation, views: dict[str, np.ndarray], snapshot: bytes | None, multi_view: bool
    ) -> None:
        where = f" in {obs.view} view" if multi_view else ""
        logger.warning(
            "Confirmed %s%s conf=%.2f bbox=%s [%s]",
            obs.label,
            where,
            obs.confidence,
            obs.bbox,
            obs.confirmation_method,
        )
        event = DetectionEvent(
            event_type="WEAPON_DETECTED",
            camera_id=self.camera_id,
            confidence=obs.confidence,
            summary=f"{obs.label.capitalize()} detected{where} — camera {self.camera_id}",
            metadata={
                "view": obs.view,
                "bbox": list(obs.bbox),
                "weaponClass": obs.label,
                "confirmationMethod": obs.confirmation_method,
                "streak": obs.streak,
                "model": self.weapon_detector.model_name,
            },
            snapshot_jpeg=snapshot,
            crop_jpeg=_encode_jpeg(crop_with_padding(views[obs.view], obs.bbox)),
        )
        _attach_faces(event, self.face_detector, views, self.watchlist)
        self.emit(event)

    def _emit_altercation(
        self, obs: PoseObservation, views: dict[str, np.ndarray], snapshot: bytes | None, multi_view: bool
    ) -> None:
        where = f" in {obs.view} view" if multi_view else ""
        what = "Possible fight" if obs.reason == "strike" else "Possible fall"
        logger.warning("Confirmed %s%s [%d frames, %d people]", obs.reason, where, obs.hits, obs.people)
        event = DetectionEvent(
            event_type="ALTERCATION",
            camera_id=self.camera_id,
            confidence=min(1.0, obs.hits / self.pose_analyzer.window_frames),
            summary=f"{what}{where} — camera {self.camera_id}",
            metadata={
                "view": obs.view,
                "bbox": list(obs.bbox),
                "reason": obs.reason,
                "people": obs.people,
                "framesWithSignal": obs.hits,
                "model": self.pose_estimator.model_name if self.pose_estimator else None,
                "modelStatus": "experimental",
            },
            snapshot_jpeg=snapshot,
            crop_jpeg=_encode_jpeg(crop_with_padding(views[obs.view], obs.bbox)),
        )
        _attach_faces(event, self.face_detector, views, self.watchlist)
        self.emit(event)

    def _emit_watchlist(
        self, match, crop: FaceCrop, views: dict[str, np.ndarray], snapshot: bytes | None, multi_view: bool
    ) -> None:
        who = match.display_name or "a watchlisted person"
        where = f" in {crop.view} view" if multi_view else ""
        logger.warning("Possible watchlist match%s: %s (similarity %.2f)", where, match.entity_profile_id, match.similarity)
        event = DetectionEvent(
            event_type="WATCHLIST_MATCH",
            camera_id=self.camera_id,
            confidence=match.similarity,
            summary=f"Possible match: {who}{where} — camera {self.camera_id} (verify)",
            metadata={"view": crop.view},
            snapshot_jpeg=snapshot,
        )
        # The matched face is face 1; its match list is all this event is about.
        _set_faces(event, [crop], self.watchlist, views)
        self.emit(event)

    def _emit_anomaly(self, obs: AnomalyObservation, views: dict[str, np.ndarray], snapshot: bytes | None) -> None:
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
                **({"view": obs.view} if obs.view else {}),
                "model": ANOMALY_MODEL_NAME,
                # Model team: not calibrated for X3 footage. Surfaced in the
                # UI so investigators weigh these alerts accordingly.
                "modelStatus": "experimental",
            },
            snapshot_jpeg=snapshot,
        )
        _attach_faces(event, self.face_detector, views, self.watchlist)
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
        # Loaded once (it's tiny) and shared with each run's FrameProcessor
        # and with panic presses.
        self._face_detector: FaceDetector | None = None
        self._face_unavailable: str | None = None
        self._face_loaded = False
        # Also once: its gallery refreshes in the background across runs.
        self._watchlist: WatchlistMatcher | None = None
        self._watchlist_unavailable: str | None = None
        self._pose_unavailable: str | None = None
        self._capture: FrameSource | None = None
        # Outlives individual runs so the publisher can keep draining it.
        self.events = EventQueue(maxsize=settings.event_queue_size)
        self._recent_events: collections.deque[dict] = collections.deque(maxlen=20)
        self._panic_lock = threading.Lock()
        self._last_panic: DetectionEvent | None = None

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
                "clip_seconds": detector.clip_seconds,
                "view_mode": detector.view_mode,
                "last_probability": round(last.probability, 4) if last else None,
                "last_view": last.view if last else None,
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
            "faces": {"enabled": self._face_detector is not None, "reason": self._face_unavailable},
            "watchlist": (
                {"enabled": True, "scan": processor.watchlist_scan if processor else None, **self._watchlist.status()}
                if self._watchlist is not None
                else {"enabled": False, "reason": self._watchlist_unavailable}
            ),
            "pose": (
                {
                    "enabled": True,
                    "recent": [
                        {"view": o.view, "reason": o.reason, "hits": o.hits, "confirmed": o.confirmed}
                        for o in processor.last_pose
                    ],
                }
                if processor is not None and processor.pose_estimator is not None
                else {"enabled": False, "reason": self._pose_unavailable}
            ),
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
        # Dropped so a panic press can't pick up a previous run's last frame.
        self._processor = None
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

    def panic(self, *, wait_seconds: float = settings.panic_frame_wait_seconds) -> tuple[DetectionEvent, bool]:
        """Queues a PANIC_BUTTON event with the camera's current (clean)
        view as evidence. Returns (event, repeated): a press within the
        cooldown returns the previous event rather than opening a second
        docket. Starts the pipeline if needed — the camera can only be
        opened once, so the frame has to come from the capture thread.
        """
        with self._panic_lock:
            last = self._last_panic
            if last is not None:
                age = (datetime.now(timezone.utc) - last.occurred_at).total_seconds()
                if age < settings.panic_cooldown_seconds:
                    return last, True

            pressed_at = datetime.now(timezone.utc)
            self.start()
            views = self._wait_for_views(wait_seconds)
            snapshot = _encode_jpeg(compose_grid(views))
            if snapshot is None:
                raise PanicCaptureError("Could not encode the camera frame")

            event = DetectionEvent(
                event_type="PANIC_BUTTON",
                camera_id=settings.camera_id,
                confidence=1.0,
                summary=f"Panic button pressed — camera {settings.camera_id}",
                metadata={"trigger": "panic_button", "views": sorted(views)},
                snapshot_jpeg=snapshot,
                occurred_at=pressed_at,
            )
            _attach_faces(event, self._face_detector, views, self._watchlist)
            logger.warning("Panic button pressed — queued %s", event.event_id)
            self._record_event(event)
            self._last_panic = event
            return event, False

    def _wait_for_views(self, wait_seconds: float) -> dict[str, np.ndarray]:
        deadline = time.time() + wait_seconds
        while True:
            processor = self._processor
            if processor is not None and processor.latest_views is not None:
                return processor.latest_views
            if not self.is_running:
                raise PanicCaptureError(f"Pipeline stopped before a frame arrived: {self._error or 'unknown error'}")
            if time.time() >= deadline:
                warning = self._capture.last_error if self._capture else None
                raise PanicCaptureError(f"No camera frame within {wait_seconds:.0f}s" + (f": {warning}" if warning else ""))
            time.sleep(0.1)

    def _record_event(self, event: DetectionEvent) -> None:
        self._recent_events.appendleft(event.describe())
        self.events.put(event)

    def _run(self, stop_event: threading.Event) -> None:
        min_frame_interval = 1.0 / settings.target_fps
        anomaly_detector: SlowFastAnomalyDetector | None = None

        try:
            weapon_detector = WeaponDetector()
            anomaly_detector, self._anomaly_unavailable = load_anomaly_detector()
            pose_estimator, self._pose_unavailable = load_pose_estimator()
            if not self._face_loaded:
                self._face_detector, self._face_unavailable = load_face_detector()
                self._watchlist, self._watchlist_unavailable = load_watchlist_matcher(self._face_detector)
                self._face_loaded = True
            self._processor = FrameProcessor(
                weapon_detector,
                anomaly_detector,
                emit=self._record_event,
                face_detector=self._face_detector,
                pose_estimator=pose_estimator,
                watchlist=self._watchlist,
            )

            # With a timed clip window, SlowFast takes frames straight from a
            # live camera at its own rate instead of the ~5 fps processed
            # ones. A file's every frame reaches the pipeline anyway.
            tap = None
            if (
                anomaly_detector is not None
                and anomaly_detector.clip_seconds > 0
                and is_live_source(settings.stream_source)
            ):
                anomaly_detector.attach_feed()
                tap = anomaly_detector.feed

            with open_capture(
                settings.stream_source,
                loop=settings.stream_loop,
                stop_event=stop_event,
                panoramic=settings.stream_panoramic,
                tap=tap,
            ) as capture:
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
