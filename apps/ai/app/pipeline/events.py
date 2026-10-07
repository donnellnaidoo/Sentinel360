"""Confirmed detections handed off from the capture loop.

The capture thread only enqueues; posting to the Node backend
(POST /internal/ai/events) happens on a separate publisher thread so a
slow or unreachable backend can never stall video processing.
"""

from __future__ import annotations

import queue
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

# Must stay in sync with AI_EVENT_TYPES in packages/api/src/services/ai-ingest.ts.
EventType = Literal["WEAPON_DETECTED", "ANOMALY_DETECTED"]


@dataclass
class DetectionEvent:
    event_type: EventType
    camera_id: str
    confidence: float
    summary: str
    metadata: dict[str, Any] = field(default_factory=dict)
    # Annotated display frame at the moment of confirmation.
    snapshot_jpeg: bytes | None = None
    # Clean close-up from the unannotated view (weapon events only).
    crop_jpeg: bytes | None = None
    # Sent as metadata.eventId so the backend can drop retried duplicates.
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def describe(self) -> dict[str, Any]:
        """JSON-safe summary (no image bytes) for /stream/status."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "confidence": round(self.confidence, 4),
            "summary": self.summary,
            "occurred_at": self.occurred_at.isoformat(),
            "metadata": self.metadata,
            "has_snapshot": self.snapshot_jpeg is not None,
            "has_crop": self.crop_jpeg is not None,
        }


class EventQueue:
    """Bounded queue that drops the OLDEST event when full: if the backend
    is down long enough to fill it, the most recent detections matter most.
    """

    def __init__(self, maxsize: int):
        self._queue: queue.Queue[DetectionEvent] = queue.Queue(maxsize=maxsize)
        self.dropped = 0

    def put(self, event: DetectionEvent) -> None:
        while True:
            try:
                self._queue.put_nowait(event)
                return
            except queue.Full:
                try:
                    self._queue.get_nowait()
                    self.dropped += 1
                except queue.Empty:
                    pass

    def get(self, timeout: float | None = None) -> DetectionEvent | None:
        try:
            return self._queue.get(timeout=timeout)
        except queue.Empty:
            return None

    def qsize(self) -> int:
        return self._queue.qsize()
