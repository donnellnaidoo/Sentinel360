import hmac
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse

from app.config import settings
from app.pipeline.pipeline import runner
from app.pipeline.publisher import EventPublisher

publisher = EventPublisher(runner.events)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # The publisher outlives individual pipeline runs so events confirmed
    # just before /stream/stop still reach the backend.
    if settings.publisher_enabled:
        publisher.start()
    yield
    runner.stop()
    publisher.stop()


app = FastAPI(title="Sentinel360 AI Pipeline", lifespan=lifespan)

MJPEG_BOUNDARY = "frame"


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "camera_id": settings.camera_id}


def require_internal_key(x_internal_api_key: str | None = Header(default=None)) -> None:
    """Camera control and the live feed are only for the web console's
    server-side proxy (apps/web /api/ai/*), which authenticates the user and
    sends the same shared secret apps/server checks (AI_SERVICE_API_KEY).
    """
    expected = settings.backend_api_key.encode()
    if x_internal_api_key is None or not hmac.compare_digest(x_internal_api_key.encode(), expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


stream = APIRouter(prefix="/stream", dependencies=[Depends(require_internal_key)])


def _status() -> dict:
    return {**runner.status(), "publisher": publisher.status()}


@stream.post("/start")
def start_stream() -> dict:
    runner.start()
    return _status()


@stream.post("/stop")
def stop_stream() -> dict:
    runner.stop()
    return _status()


@stream.get("/status")
def stream_status() -> dict:
    return _status()


def _mjpeg_generator():
    # Waits for the first frame rather than emitting an empty response if a
    # browser opens this before /stream/start has produced anything yet.
    while runner.latest_jpeg() is None:
        if not runner.is_running:
            return
        time.sleep(0.1)

    while runner.is_running:
        frame = runner.latest_jpeg()
        if frame is not None:
            yield (
                f"--{MJPEG_BOUNDARY}\r\nContent-Type: image/jpeg\r\n\r\n".encode()
                + frame
                + b"\r\n"
            )
        time.sleep(1.0 / settings.target_fps)


@stream.get("/mjpeg")
def stream_mjpeg() -> StreamingResponse:
    return StreamingResponse(
        _mjpeg_generator(),
        media_type=f"multipart/x-mixed-replace; boundary={MJPEG_BOUNDARY}",
    )


app.include_router(stream)
