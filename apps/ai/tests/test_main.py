"""/stream/* requires the shared internal key; /health stays open."""

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def test_health_is_public():
    assert client.get("/health").status_code == 200


def test_stream_routes_reject_missing_or_wrong_key():
    for method, path in [("get", "/stream/status"), ("get", "/stream/mjpeg"), ("post", "/stream/start"), ("post", "/stream/stop")]:
        assert getattr(client, method)(path).status_code == 401, path
        assert getattr(client, method)(path, headers={"X-Internal-Api-Key": "wrong"}).status_code == 401, path


def test_status_with_key_includes_publisher():
    response = client.get("/stream/status", headers={"X-Internal-Api-Key": settings.backend_api_key})
    assert response.status_code == 200
    body = response.json()
    assert body["running"] is False
    assert "publisher" in body and "events" in body
