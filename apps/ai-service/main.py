import asyncio
import io
import time
from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from anomaly_model import AnomalyModel
from stream_processor import StreamProcessor
from pathlib import Path


app = FastAPI(title="Sentinel360 AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

root = Path(__file__).resolve().parents[1]
# Prefer models placed inside the service at apps/ai-service/models
local_models_dir = root / "models"
MODEL_VS = str((local_models_dir / "model_an_vs_nor.h5") if (local_models_dir / "model_an_vs_nor.h5").exists() else (root / "../model" / "model_an_vs_nor.h5"))
MODEL_CL = str((local_models_dir / "model_an_cl.h5") if (local_models_dir / "model_an_cl.h5").exists() else (root / "../model" / "model_an_cl.h5"))


ai_model: AnomalyModel = None
processor: StreamProcessor = None


@app.on_event("startup")
async def startup_event():
    global ai_model, processor
    try:
        ai_model = AnomalyModel(vs_path=MODEL_VS, cl_path=MODEL_CL)
        print("[INFO] AI model initialized (may be in mock mode if real models failed to load)")
    except Exception as e:
        print(f"[ERROR] Failed to initialize AI model: {e}")
        # Still create a mock model so the service can run
        ai_model = AnomalyModel.__new__(AnomalyModel)
        ai_model.vs_model = None
        ai_model.cl_model = None
        ai_model.mock_mode = True
        ai_model.class_names = [
            "Fighting", "Shoplifting", "Abuse", "Arrest", "Shooting", "Robbery", "Explosion",
        ]
    
    # start background stream processing
    youtube = "https://www.youtube.com/watch?v=ZMBj8CnNR8M"
    processor = StreamProcessor(ai_model, youtube, sample_interval=1.5)
    asyncio.create_task(processor.run())


@app.post("/analyze-frame")
async def analyze_frame(frame: UploadFile = File(...)):
    contents = await frame.read()
    import numpy as np
    import cv2

    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return JSONResponse({"error": "invalid image"}, status_code=400)

    try:
        result = ai_model.predict(img)
    except Exception as e:
        result = {"anomaly": False, "type": None, "confidence": 0.0}

    return result


@app.get("/events")
async def get_events():
    return {"events": processor.get_events()}


@app.get("/raw-stream")
async def raw_stream():
    """Proxy the resolved YouTube/direct stream URL and return a streaming response.

    This attempts to use yt-dlp to resolve a playable URL and then proxies bytes.
    """
    import httpx

    try:
        stream_url = processor._resolve_stream()
    except Exception:
        return JSONResponse({"error": "failed to resolve stream"}, status_code=500)

    async def stream_bytes():
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("GET", stream_url) as resp:
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk

    return StreamingResponse(stream_bytes(), media_type="video/mp4")


@app.get("/demo-stream")
async def demo_stream():
    # serve a local demo file if present at apps/ai-service/static/demo.mp4
    demo_path = root / "static" / "demo.mp4"
    if not demo_path.exists():
        return JSONResponse({"error": "demo video not found. Place demo.mp4 at apps/ai-service/static/demo.mp4"}, status_code=404)
    from fastapi.responses import FileResponse

    return FileResponse(path=str(demo_path), media_type="video/mp4")


@app.get("/live-stream")
async def live_stream():
    """Serve live stream - tries demo first, then raw stream, then YouTube."""
    from fastapi.responses import FileResponse, StreamingResponse
    import httpx
    
    # Try demo stream first (most reliable)
    demo_path = root / "static" / "demo.mp4"
    if demo_path.exists():
        return FileResponse(path=str(demo_path), media_type="video/mp4")
    
    # Fall back to raw stream
    try:
        stream_url = processor._resolve_stream()
        
        async def stream_bytes():
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("GET", stream_url) as resp:
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        yield chunk
        
        return StreamingResponse(stream_bytes(), media_type="video/mp4")
    except Exception as e:
        print(f"[ERROR] Failed to get raw stream: {e}")
        return JSONResponse(
            {"error": "Could not load live stream. Ensure demo.mp4 exists or YouTube stream is accessible."},
            status_code=503
        )

