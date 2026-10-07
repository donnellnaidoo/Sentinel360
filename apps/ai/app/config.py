from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Stream source — see pipeline/capture.py#open_capture. One of:
    #   x3tcp://127.0.0.1:5001   Insta360 X3 via Sentinel360X3Stitcher.exe
    #   rtsp://... / http://...  network camera
    #   0, 1, ...                USB webcam by device number
    #   samples/demo.mp4         local file, looped as the "stream"
    # All go through the exact same capture interface.
    stream_source: str = "samples/demo.mp4"
    # True when a webcam/network/file source is a 2:1 360° panorama (e.g. the
    # X3 in USB webcam mode), so it is split into Front/Right/Rear/Left.
    stream_panoramic: bool = False
    stream_loop: bool = True
    camera_id: str = "CAM-DEMO-1"

    # CPU performance budget (see apps/ai/README.md): detection/tracking runs
    # on every processed frame; heavier stages (face, ALPR, weapon) run at a
    # reduced cadence once those pipeline stages land in later tasks.
    target_fps: float = 5.0
    detect_input_size: int = 640
    detector_model_path: str = "models/yolo11n.pt"
    detector_confidence: float = 0.4

    # X3 panorama -> 4 perspective views (pipeline/dewarp.py).
    x3_view_fov: float = 100.0
    x3_view_width: int = 480
    x3_view_height: int = 360

    # Weapon detection (pipeline/weapon.py). Stock COCO yolov8n — "knife" is
    # the only weapon class it has. Defaults are the model team's tested
    # values; see their handoff notes before changing them.
    weapon_model_path: str = "models/yolov8n.pt"
    # auto = cuda > mps > cpu. On an M-series Mac, MPS runs the 4-view X3
    # batch ~2x faster than CPU (106 vs 224 ms) with identical detections.
    weapon_device: str = "auto"
    weapon_display_confidence: float = 0.10
    knife_alarm_confidence: float = 0.45
    knife_consecutive_required: int = 3
    knife_high_conf_bypass: float = 0.85
    weapon_alarm_cooldown_seconds: float = 5.0
    knife_crop_padding: float = 0.20

    # SlowFast anomaly detection (pipeline/anomaly.py). EXPERIMENTAL — not
    # calibrated for X3 footage per the model team; this flag is the kill
    # switch if it misbehaves or the CPU can't keep up.
    anomaly_enabled: bool = True
    slowfast_model_path: str = "models/slowfast_ucfcrime_binary.pth"
    anomaly_device: str = "auto"  # auto = cuda > mps > cpu
    anomaly_threshold: float = 0.60
    anomaly_consecutive_required: int = 3
    # Processed frames between SlowFast passes; skipped while the previous
    # pass is still running, so slow hardware just scores less often.
    anomaly_inference_stride: int = 8

    # Confirmed detections wait here for the backend publisher; oldest are
    # dropped if the backend is unreachable for long enough to fill it.
    event_queue_size: int = 50

    # Node/Hono ingestion endpoint (packages/api/src/services/ai-ingest.ts,
    # apps/server POST /internal/ai/events).
    backend_url: str = "http://localhost:3000"
    backend_api_key: str = "dev-ai-pipeline-shared-secret-change-me"
    publisher_enabled: bool = True
    # Ingest against hosted Supabase takes ~11s (incident, docket, two
    # evidence uploads, notifications), so this must sit well above that.
    publisher_timeout_seconds: float = 30.0
    publisher_max_backoff_seconds: float = 30.0

    # Optional camera location sent with every event (incident/alert location).
    camera_location_name: str | None = None
    camera_latitude: float | None = None
    camera_longitude: float | None = None


settings = Settings()
