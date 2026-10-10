"""Panic button: PipelineRunner.panic captures the current clean view,
debounces repeat presses, and POST/GET /stream/panic report delivery."""

from types import SimpleNamespace

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app, publisher
from app.pipeline import pipeline as pipeline_module
from app.pipeline.faces import FaceCrop
from app.pipeline.pipeline import PanicCaptureError, PipelineRunner

HEADERS = {"X-Internal-Api-Key": settings.backend_api_key}


class _StubRunner(PipelineRunner):
    """A runner that is "running" without a capture thread or models."""

    is_running = True

    def start(self) -> None:
        pass


def _running_runner(
    views: dict[str, np.ndarray] | None, panorama: np.ndarray | None = None
) -> PipelineRunner:
    runner = _StubRunner()
    runner._processor = SimpleNamespace(latest_views=views, latest_panorama=panorama)
    return runner


def test_panic_queues_event_with_clean_snapshot():
    view = np.full((60, 80, 3), 120, dtype=np.uint8)
    runner = _running_runner({"Single": view})

    event, repeated = runner.panic()

    assert not repeated
    assert event.event_type == "PANIC_BUTTON"
    assert event.confidence == 1.0
    assert event.crop_jpeg is None
    decoded = cv2.imdecode(np.frombuffer(event.snapshot_jpeg, np.uint8), cv2.IMREAD_COLOR)
    assert decoded.shape == view.shape
    assert runner.events.get(timeout=0) is event


def test_panic_from_a_360_camera_attaches_the_panorama():
    panorama = np.full((480, 960, 3), 120, dtype=np.uint8)
    runner = _running_runner({"Front": np.zeros((36, 48, 3), dtype=np.uint8)}, panorama)

    event, _ = runner.panic()

    decoded = cv2.imdecode(np.frombuffer(event.panorama_jpeg, np.uint8), cv2.IMREAD_COLOR)
    assert decoded.shape == panorama.shape
    assert runner.events.get(timeout=0) is event


def test_panic_attaches_faces_from_the_current_views():
    view = np.full((60, 80, 3), 120, dtype=np.uint8)
    runner = _running_runner({"Single": view})
    runner._face_detector = SimpleNamespace(
        crops=lambda views: [FaceCrop("Single", 0.8, (1, 1, 20, 20), b"\xff\xd8face")]
    )

    event, _ = runner.panic()

    assert event.face_jpegs == [b"\xff\xd8face"]
    assert event.metadata["faces"] == [{"view": "Single", "bbox": [1, 1, 20, 20], "confidence": 0.8}]


def test_repeat_press_within_cooldown_returns_same_event():
    runner = _running_runner({"Single": np.zeros((10, 10, 3), dtype=np.uint8)})

    first, _ = runner.panic()
    second, repeated = runner.panic()

    assert repeated and second is first
    assert runner.events.qsize() == 1


def test_panic_without_a_frame_times_out():
    runner = _running_runner(None)
    with pytest.raises(PanicCaptureError, match="No camera frame"):
        runner.panic(wait_seconds=0.2)
    assert runner.events.qsize() == 0


def test_panic_routes_require_key_and_report_state(monkeypatch):
    client = TestClient(app)
    assert client.post("/stream/panic").status_code == 401
    assert client.get("/stream/panic/abc").status_code == 401

    fake = SimpleNamespace(event_id="evt-1")
    monkeypatch.setattr(pipeline_module.runner, "panic", lambda: (fake, False))
    response = client.post("/stream/panic", headers=HEADERS)
    assert response.json() == {"event_id": "evt-1", "repeated": False, "state": "queued"}

    publisher._remember("evt-1", {"state": "sent", "caseNumber": "S360-2026-00009"})
    body = client.get("/stream/panic/evt-1", headers=HEADERS).json()
    assert body["state"] == "sent" and body["caseNumber"] == "S360-2026-00009"


def test_panic_route_returns_503_when_no_frame(monkeypatch):
    def fail():
        raise PanicCaptureError("No camera frame within 20s")

    monkeypatch.setattr(pipeline_module.runner, "panic", fail)
    response = TestClient(app).post("/stream/panic", headers=HEADERS)
    assert response.status_code == 503
    assert "No camera frame" in response.json()["detail"]
