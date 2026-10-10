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

    # Frames processed per second (see apps/ai/README.md, Performance).
    target_fps: float = 5.0
    # YOLO input size for the weapon model. A knife in a 480x360 view is
    # only a few pixels wide at 640; 960 helps small objects (~2x slower).
    detect_input_size: int = 640

    # X3 panorama -> 4 perspective views (pipeline/dewarp.py).
    x3_view_fov: float = 100.0
    x3_view_width: int = 480
    x3_view_height: int = 360

    # Weapon detection (pipeline/weapon.py). Stock COCO yolov8n — "knife" is
    # the only weapon class it has. Defaults are the model team's tested
    # values; see their handoff notes before changing them.
    weapon_model_path: str = "models/yolov8n.pt"
    # Classes that raise a weapon alarm. Stock COCO only has "knife"; a
    # fine-tuned model (scripts/train_weapon.py) adds e.g. pistol, rifle.
    # Names the loaded model doesn't have are ignored.
    weapon_alarm_labels: list[str] = ["knife"]
    # Separate COCO model for person boxes, for a fine-tuned weapon model
    # that has no "person" class. Empty = use the weapon model's persons.
    weapon_person_model_path: str = ""
    # A second, ready-made model for weapons the main one can't see. The
    # default is a public YOLOv8n threat model that adds guns
    # (scripts/download_models.py fetches it). Only its
    # weapon_extra_labels classes are used — the main model stays in charge
    # of knives, which it detects better on the X3. Empty path, or the file
    # missing, = main model only (/stream/status says which).
    weapon_extra_model_path: str = "models/threat_yolov8n.pt"
    weapon_extra_labels: list[str] = ["Gun"]
    # auto = cuda > mps > cpu. On an M-series Mac, MPS runs the 4-view X3
    # batch ~2x faster than CPU (106 vs 224 ms) with identical detections.
    weapon_device: str = "auto"
    weapon_display_confidence: float = 0.10
    knife_alarm_confidence: float = 0.45
    knife_consecutive_required: int = 3
    knife_high_conf_bypass: float = 0.85
    weapon_alarm_cooldown_seconds: float = 5.0
    knife_crop_padding: float = 0.20
    # Persistence window: alarm when a weapon is seen in at least
    # knife_consecutive_required of the last knife_window_frames frames in
    # one view. Equal to knife_consecutive_required = must be consecutive
    # (the model team's rule); e.g. 5 lets one missed frame through.
    knife_window_frames: int = 3
    # Only alarm on a weapon close to a person (box centre inside the
    # person box grown by weapon_person_margin x its size on each side),
    # so knives lying on a counter don't fire.
    weapon_require_person: bool = False
    weapon_person_margin: float = 0.25

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
    # Seconds of video one SlowFast clip covers. 0 = the last 32 processed
    # frames (~6.4 s at 5 fps — far longer than the ~1 s training clips).
    # >0 = 32 frames spread over this window, taken from every frame the
    # camera delivers rather than only the processed ones.
    anomaly_clip_seconds: float = 0.0
    # composite: the four X3 views squashed into one 224x224 clip.
    # per_view: each view scored as its own 224x224 clip, max score wins.
    # per_view_people: per_view, but only views where a person is visible.
    anomaly_view_mode: str = "composite"

    # Face crops attached to every event's docket (pipeline/faces.py).
    # Detection only, no identity. All faces in all views, largest first.
    face_enabled: bool = True
    face_model_path: str = "models/face_detection_yunet_2023mar.onnx"
    face_confidence: float = 0.7
    face_min_size: int = 20
    # Must stay <= MAX_AI_FACES in packages/api/src/services/ai-ingest.ts.
    face_max_per_event: int = 5
    face_crop_padding: float = 0.35
    # Keeps each crop well under the backend's per-face size cap.
    face_crop_max_side: int = 256

    # Full 360° frame attached to every event from a panoramic source, for
    # the docket's 360° viewer. Shrunk until it fits the byte cap, which must
    # stay <= MAX_AI_PANORAMA_BYTES in packages/api/src/services/ai-ingest.ts.
    panorama_evidence_enabled: bool = True
    panorama_max_width: int = 3840
    panorama_max_bytes: int = 1000 * 1024
    # Snapshots and close-ups are re-encoded smaller if needed to stay
    # under this; must stay <= MAX_AI_MEDIA_BYTES (768 KB) in ai-ingest.ts,
    # which rejects the whole event over one oversized image.
    evidence_image_max_bytes: int = 760 * 1024

    # Watchlist face matching (pipeline/watchlist.py). OFF by default:
    # biometric matching against wanted persons needs a POPIA basis. A
    # match is only a suggestion attached to the alert for an officer to
    # verify — it never acts on its own.
    face_recognition_enabled: bool = False
    face_recognition_model_path: str = "models/face_recognition_sface_2021dec.onnx"
    # Cosine similarity for SFace; 0.363 is OpenCV's published threshold.
    face_match_threshold: float = 0.363
    # How often the wanted-person photos are re-fetched from the backend.
    watchlist_refresh_seconds: float = 300.0
    # Also look for watchlisted faces on ordinary frames (not only when
    # another event fires) and raise WATCHLIST_MATCH for review.
    face_watchlist_scan: bool = False
    face_scan_every_frames: int = 5
    # One WATCHLIST_MATCH per person per this many seconds.
    watchlist_match_cooldown_seconds: float = 300.0

    # Pose-based altercation detection (pipeline/pose.py). EXPERIMENTAL,
    # off by default. Rules on YOLO11n-pose keypoints: fast arm movement
    # by people close together, or a fall.
    pose_enabled: bool = False
    pose_model_path: str = "models/yolo11n-pose.pt"
    pose_confidence: float = 0.4
    # Wrist speed, in body heights per second, that counts as a strike.
    pose_strike_speed: float = 2.5
    # Two people count as close when their boxes are within this many
    # body widths of each other.
    pose_close_distance: float = 0.5
    pose_consecutive_required: int = 3
    pose_alarm_cooldown_seconds: float = 10.0

    # Panic button (apps/panic -> POST /stream/panic). If the pipeline is
    # stopped, a press starts it and waits this long for the first frame
    # (the X3 stitcher can take a while). Presses within the cooldown return
    # the docket already being opened instead of opening another.
    panic_frame_wait_seconds: float = 20.0
    panic_cooldown_seconds: float = 10.0

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
