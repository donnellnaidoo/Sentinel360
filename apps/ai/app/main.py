import time

from fastapi import FastAPI
from fastapi.responses import StreamingResponse

from app.config import settings
from app.pipeline.pipeline import runner

app = FastAPI(title="Sentinel360 AI Pipeline")

MJPEG_BOUNDARY = "frame"


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "camera_id": settings.camera_id}


@app.post("/stream/start")
def start_stream() -> dict:
    runner.start()
    return runner.status()


@app.post("/stream/stop")
def stop_stream() -> dict:
    runner.stop()
    return runner.status()


@app.get("/stream/status")
def stream_status() -> dict:
    return runner.status()


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


@app.get("/stream/mjpeg")
def stream_mjpeg() -> StreamingResponse:
    return StreamingResponse(
        _mjpeg_generator(),
        media_type=f"multipart/x-mixed-replace; boundary={MJPEG_BOUNDARY}",
    )
