"""Posts confirmed detections to the Node backend
(apps/server POST /internal/ai/events -> packages/api ingestAiEvent),
which opens the docket, attaches the images as evidence and raises the
alert.

Runs on its own thread, draining the EventQueue the capture loop fills,
so a slow or unreachable backend never stalls video processing. Retries are
safe: every event carries an eventId and the backend returns the original
docket (200, duplicate=true) for an id it has already ingested.
"""

from __future__ import annotations

import base64
import logging
import threading
import time
from collections import OrderedDict
from typing import Any

import httpx

from app.config import settings
from app.pipeline.events import DetectionEvent, EventQueue

logger = logging.getLogger(__name__)

INGEST_PATH = "/internal/ai/events"

# Client errors that will never succeed on retry (bad payload, bad key,
# payload too large). 408/429 are retried like server errors.
_PERMANENT_STATUS = {400, 401, 403, 404, 413, 422}

# Outcomes kept for result_for() (the panic app polls its own event).
_RESULTS_KEPT = 50


def build_payload(event: DetectionEvent, location: dict[str, Any] | None = None) -> dict[str, Any]:
    """JSON body matching aiEventSchema in apps/server/src/index.ts."""
    media = []
    if event.snapshot_jpeg:
        media.append({"kind": "SNAPSHOT", "mimeType": "image/jpeg", "dataBase64": base64.b64encode(event.snapshot_jpeg).decode()})
    if event.crop_jpeg:
        media.append({"kind": "CROP", "mimeType": "image/jpeg", "dataBase64": base64.b64encode(event.crop_jpeg).decode()})
    for face in event.face_jpegs:
        media.append({"kind": "FACE", "mimeType": "image/jpeg", "dataBase64": base64.b64encode(face).decode()})

    payload: dict[str, Any] = {
        "eventId": event.event_id,
        "cameraId": event.camera_id,
        "eventType": event.event_type,
        "confidence": round(min(max(event.confidence, 0.0), 1.0), 4),
        "occurredAt": event.occurred_at.isoformat(),
        "summary": event.summary[:500],
        "metadata": event.metadata,
        "media": media,
    }
    if location:
        payload["location"] = location
    return payload


def camera_location() -> dict[str, Any] | None:
    location: dict[str, Any] = {}
    if settings.camera_location_name:
        location["name"] = settings.camera_location_name
    if settings.camera_latitude is not None and settings.camera_longitude is not None:
        location["latitude"] = settings.camera_latitude
        location["longitude"] = settings.camera_longitude
    return location or None


class PermanentPublishError(Exception):
    pass


class EventPublisher:
    def __init__(
        self,
        events: EventQueue,
        *,
        client: httpx.Client | None = None,
        backend_url: str = settings.backend_url,
        api_key: str = settings.backend_api_key,
        initial_backoff_seconds: float = 1.0,
        max_backoff_seconds: float = settings.publisher_max_backoff_seconds,
    ):
        self.events = events
        self._client = client or httpx.Client(timeout=settings.publisher_timeout_seconds)
        self._url = backend_url.rstrip("/") + INGEST_PATH
        self._headers = {"X-Internal-Api-Key": api_key}
        self.initial_backoff_seconds = initial_backoff_seconds
        self.max_backoff_seconds = max_backoff_seconds
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

        self.sent = 0
        self.duplicates = 0
        self.failed = 0
        self.last_error: str | None = None
        self.last_result: dict[str, Any] | None = None
        self._results: OrderedDict[str, dict[str, Any]] = OrderedDict()
        self._results_lock = threading.Lock()

    def result_for(self, event_id: str) -> dict[str, Any] | None:
        """{"state": "sent", ...backend response} or {"state": "failed",
        "error": ...}; None while the event is still queued or retrying."""
        with self._results_lock:
            return self._results.get(event_id)

    def _remember(self, event_id: str, outcome: dict[str, Any]) -> None:
        with self._results_lock:
            self._results[event_id] = outcome
            while len(self._results) > _RESULTS_KEPT:
                self._results.popitem(last=False)

    def status(self) -> dict[str, Any]:
        return {
            "running": self._thread is not None and self._thread.is_alive(),
            "backend_url": self._url,
            "sent": self.sent,
            "duplicates": self.duplicates,
            "failed": self.failed,
            "last_error": self.last_error,
            "last_result": self.last_result,
        }

    def start(self) -> None:
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, name="event-publisher", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
        self._thread = None

    def _run(self) -> None:
        while not self._stop_event.is_set():
            event = self.events.get(timeout=0.5)
            if event is not None:
                self.publish(event)

    def post_once(self, event: DetectionEvent) -> dict[str, Any]:
        """One attempt. Raises PermanentPublishError for responses a retry
        can't fix, httpx errors for ones it might."""
        response = self._client.post(self._url, json=build_payload(event, camera_location()), headers=self._headers)
        if response.status_code in _PERMANENT_STATUS:
            raise PermanentPublishError(f"HTTP {response.status_code}: {response.text[:300]}")
        response.raise_for_status()
        return response.json()

    def publish(self, event: DetectionEvent) -> bool:
        """Delivers one event, retrying transient failures with capped
        exponential backoff until it lands, fails permanently, or the
        publisher stops. Holding the head of the queue keeps events in order;
        the queue's drop-oldest bound caps what piles up behind it.
        """
        backoff = self.initial_backoff_seconds
        attempt = 0
        while True:
            attempt += 1
            try:
                result = self.post_once(event)
            except PermanentPublishError as exc:
                self.failed += 1
                self.last_error = str(exc)
                self._remember(event.event_id, {"state": "failed", "error": str(exc)})
                logger.error("Dropping %s %s: %s", event.event_type, event.event_id, exc)
                return False
            except httpx.HTTPError as exc:
                self.last_error = f"{type(exc).__name__}: {exc}"
                logger.warning(
                    "Publishing %s %s failed (attempt %d), retrying in %.0fs: %s",
                    event.event_type,
                    event.event_id,
                    attempt,
                    backoff,
                    self.last_error,
                )
                if self._stop_event.wait(backoff):
                    # Shutting down mid-retry: put it back so a restart
                    # (same process) can still deliver it.
                    self.events.put(event)
                    return False
                backoff = min(backoff * 2, self.max_backoff_seconds)
                continue

            self.last_error = None
            self.last_result = {"event_id": event.event_id, **result}
            self._remember(event.event_id, {"state": "sent", **result})
            # A duplicate on a retry means one of OUR earlier attempts landed
            # (e.g. the response timed out after the backend committed), so
            # it counts as sent. A duplicate on attempt 1 came from elsewhere.
            if result.get("duplicate") and attempt == 1:
                self.duplicates += 1
            else:
                self.sent += 1
            logger.info(
                "Published %s %s -> case %s (%d evidence item(s))%s",
                event.event_type,
                event.event_id,
                result.get("caseNumber"),
                len(result.get("evidenceIds") or []),
                " [duplicate]" if result.get("duplicate") else "",
            )
            return True
