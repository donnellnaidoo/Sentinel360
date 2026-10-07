"""EventPublisher against httpx.MockTransport — payload shape, retries,
permanent failures, duplicates.
"""

import base64
import json

import httpx

from app.pipeline.events import DetectionEvent, EventQueue
from app.pipeline.publisher import EventPublisher, build_payload


def _event(**overrides) -> DetectionEvent:
    values = dict(
        event_type="WEAPON_DETECTED",
        camera_id="CAM-TEST",
        confidence=0.58,
        summary="Knife detected in Rear view — camera CAM-TEST",
        metadata={"view": "Rear", "bbox": [1, 2, 3, 4]},
        snapshot_jpeg=b"\xff\xd8snapshot",
        crop_jpeg=b"\xff\xd8crop",
    )
    values.update(overrides)
    return DetectionEvent(**values)


def _publisher(handler, events: EventQueue | None = None) -> EventPublisher:
    return EventPublisher(
        events or EventQueue(maxsize=10),
        client=httpx.Client(transport=httpx.MockTransport(handler)),
        backend_url="http://backend.test/",
        api_key="secret",
        initial_backoff_seconds=0,
        max_backoff_seconds=0,
    )


def _created(request: httpx.Request) -> httpx.Response:
    return httpx.Response(201, json={"caseNumber": "S360-2026-00001", "evidenceIds": ["a", "b"], "duplicate": False})


def test_payload_matches_backend_schema():
    event = _event()
    payload = build_payload(event, {"name": "Main gate"})

    assert payload["eventId"] == event.event_id
    assert payload["eventType"] == "WEAPON_DETECTED"
    assert payload["occurredAt"].endswith("+00:00")
    assert payload["location"] == {"name": "Main gate"}
    assert [m["kind"] for m in payload["media"]] == ["SNAPSHOT", "CROP"]
    assert base64.b64decode(payload["media"][1]["dataBase64"]) == b"\xff\xd8crop"
    json.dumps(payload)  # must be JSON-serialisable as-is


def test_anomaly_payload_has_snapshot_only():
    payload = build_payload(_event(event_type="ANOMALY_DETECTED", crop_jpeg=None))
    assert [m["kind"] for m in payload["media"]] == ["SNAPSHOT"]
    assert "location" not in payload


def test_posts_with_api_key_to_ingest_route():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return _created(request)

    publisher = _publisher(handler)
    assert publisher.publish(_event())

    (request,) = seen
    assert str(request.url) == "http://backend.test/internal/ai/events"
    assert request.headers["X-Internal-Api-Key"] == "secret"
    assert publisher.sent == 1
    assert publisher.last_result["caseNumber"] == "S360-2026-00001"


def test_retries_server_errors_and_network_failures_with_same_event_id():
    responses = iter(["down", 503, 201])
    event_ids: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        event_ids.append(json.loads(request.content)["eventId"])
        outcome = next(responses)
        if outcome == "down":
            raise httpx.ConnectError("connection refused")
        if outcome == 503:
            return httpx.Response(503)
        return _created(request)

    publisher = _publisher(handler)
    assert publisher.publish(_event())
    assert len(event_ids) == 3 and len(set(event_ids)) == 1
    assert publisher.sent == 1 and publisher.last_error is None


def test_permanent_client_error_is_dropped_without_retry():
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(401, json={"error": "Unauthorized"})

    publisher = _publisher(handler)
    assert not publisher.publish(_event())
    assert calls == 1
    assert publisher.failed == 1
    assert "401" in publisher.last_error


def test_duplicate_response_is_counted_separately():
    publisher = _publisher(lambda r: httpx.Response(200, json={"caseNumber": "S360-2026-00001", "duplicate": True}))
    assert publisher.publish(_event())
    assert (publisher.sent, publisher.duplicates) == (0, 1)


def test_background_thread_drains_queue():
    events = EventQueue(maxsize=10)
    publisher = _publisher(_created, events)
    for _ in range(3):
        events.put(_event())

    publisher.start()
    try:
        import time

        deadline = time.time() + 5
        while publisher.sent < 3 and time.time() < deadline:
            time.sleep(0.05)
    finally:
        publisher.stop()

    assert publisher.sent == 3
    assert events.qsize() == 0


def test_duplicate_after_own_timeout_counts_as_sent():
    responses = iter(["timeout", "duplicate"])

    def handler(request: httpx.Request) -> httpx.Response:
        if next(responses) == "timeout":
            raise httpx.ReadTimeout("backend still committing")
        return httpx.Response(200, json={"caseNumber": "S360-2026-00011", "duplicate": True})

    publisher = _publisher(handler)
    assert publisher.publish(_event())
    assert (publisher.sent, publisher.duplicates) == (1, 0)
