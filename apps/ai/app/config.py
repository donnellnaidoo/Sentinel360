from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Stream source: an rtsp:// URL for a live camera, or a local file path
    # (e.g. samples/demo.mp4) to loop as the "stream" — see pipeline/capture.py.
    # Both go through the exact same capture interface.
    stream_source: str = "samples/demo.mp4"
    stream_loop: bool = True
    camera_id: str = "CAM-DEMO-1"

    # CPU performance budget (see apps/ai/README.md): detection/tracking runs
    # on every processed frame; heavier stages (face, ALPR, weapon) run at a
    # reduced cadence once those pipeline stages land in later tasks.
    target_fps: float = 5.0
    detect_input_size: int = 640
    detector_model_path: str = "models/yolo11n.pt"
    detector_confidence: float = 0.4

    # Node/Hono ingestion endpoint (packages/api/src/services/ai-ingest.ts,
    # apps/server POST /internal/ai/events).
    backend_url: str = "http://localhost:3000"
    backend_api_key: str = "dev-ai-pipeline-shared-secret-change-me"


settings = Settings()
