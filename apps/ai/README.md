# apps/ai — Sentinel360 CCTV AI pipeline (demo scope)

Single-stream, CPU-only computer vision pipeline: person/vehicle detection +
tracking, face recognition against a watchlist, ALPR, and weapon/altercation
"crime" triggers. On a trigger it posts a structured event to the existing
Node backend (`POST /internal/ai/events`), which creates the incident, opens
a case (docket), and raises an alert in the normal Sentinel360 tables — see
`packages/api/src/services/ai-ingest.ts`.

Deliberately out of scope for this service (see `.claude/plans` /
project decisions): multi-camera re-identification, GPU inference, thousands
of concurrent streams, real fighting/robbery/vandalism action-recognition
models. This is a single-stream demo pipeline, not the production
architecture described in `docs/02-ARCHITECTURE/05-AI-PIPELINE-ARCHITECTURE.md`.

## Setup

Requires Python 3.11 or 3.12 (pinned via `.python-version`) — newer Pythons
don't yet have wheels for some of these packages. Install
[uv](https://docs.astral.sh/uv/) if you don't have it.

```bash
cd apps/ai
uv sync                 # or: bun run setup (from repo root: bun run --filter ai setup)
```

Download model weights into `models/` (gitignored — not committed):

```bash
# Ultralytics auto-downloads YOLO11n on first run if models/yolo11n.pt is
# missing, but pre-fetching keeps first-run latency out of a live demo:
uv run python -c "from ultralytics import YOLO; YOLO('yolo11n.pt').save('models/yolo11n.pt')"
```

Weapon + anomaly models come from the model team's handoff
(`sentinal360-AI-model_Integration.zip`, `py-weight/`) — copy them into
`models/` (135 MB, never commit them):

| File | Used by |
|---|---|
| `models/yolov8n.pt` | `app/pipeline/weapon.py` — knife detection (stock COCO; no firearm class) |
| `models/slowfast_ucfcrime_binary.pth` | SlowFast anomaly detection (experimental, uncalibrated for X3) |

`pytorchvideo` is installed from git by `uv sync`, so SlowFast builds
locally — no `torch.hub` GitHub fetch at runtime.

Face recognition (buffalo_s) and ALPR (PaddleOCR mobile models) are added in
later phases.

## Configuration

Copy `.env.example` to `.env` (create one if it doesn't exist yet) and set:

| Var | Purpose |
|---|---|
| `STREAM_SOURCE` | `x3tcp://127.0.0.1:5001` for the Insta360 X3 (requires `Sentinel360X3Stitcher.exe` running — Windows only), `rtsp://...` / `http://.../video` for a network camera, or a local file path (e.g. `samples/demo.mp4`) to loop as the demo stream |
| `STREAM_LOOP` | Whether to loop the file source (ignored for RTSP) |
| `CAMERA_ID` | Logical camera id sent with every event/detection |
| `BACKEND_URL` | Base URL of the Node/Hono server (`apps/server`) |
| `BACKEND_API_KEY` | Must match `AI_SERVICE_API_KEY` in `apps/server/.env` |

Full list and defaults: `app/config.py`.

## Running

```bash
bun run dev:ai     # from repo root — same convention as dev:web/dev:server
# or directly:
cd apps/ai && uv run uvicorn app.main:app --reload --port 8001
```

- `GET /health` — liveness check
- `POST /stream/start` / `POST /stream/stop` — run the pipeline
- `GET /stream/mjpeg` — live preview: person/knife boxes, 2x2 Front/Right/Left/Rear
  grid for X3, anomaly score, red border while an alarm is active
- `GET /stream/status` — fps, per-view knife streaks, SlowFast state
  (device, last probability, streak), queued/dropped/recent events

Confirmed detections (knife: 3 consecutive frames in one view or ≥0.85;
anomaly: 3 consecutive fresh SlowFast results ≥0.60) become events with an
annotated snapshot (+ clean crop for knives) on `runner.events`, for the
backend publisher to post. Thresholds are the model team's tested values —
see `app/config.py`.

## Performance

Runs on a laptop, not a GPU edge node — the numbers in the main architecture
doc don't apply here. YOLO and SlowFast both pick a device automatically
(`WEAPON_DEVICE` / `ANOMALY_DEVICE` = `auto`: cuda > mps > cpu). On an
M-series Mac, MPS gives identical detections to CPU and roughly doubles
throughput. Measured on the per-frame pipeline with no FPS cap
(`TARGET_FPS` caps it at 5 by default):

| Source | Anomaly | YOLO on CPU | YOLO on MPS |
|---|---|---|---|
| Single view (640x480) | off | 20.3 fps | 46.7 fps |
| Single view (640x480) | on | 15.0 fps | 19.4 fps |
| X3, 4 views (960x480 pano) | off | 4.2 fps | 13.0 fps |
| X3, 4 views (960x480 pano) | on | 3.4 fps | 6.5 fps |

SlowFast takes ~0.7 s per clip on MPS, so at the default
`ANOMALY_INFERENCE_STRIDE=8` and 5 fps it scores a clip every ~1.6 s without
falling behind. Note that at 5 fps the 32-frame clip spans ~6.4 s, while the
model was trained on ~1 s clips — one reason its scores aren't calibrated.

Backend ingest (hosted Supabase) is the slowest hop: the alert and
notifications land ~2.5 s after the backend receives an event, and the
evidence images a few seconds later. Detection -> full docket is ~10 s.

## Tests

```bash
bun run test                    # from repo root: ai (pytest), server, api
uv run pytest -q                # this service only — no models or network needed
```

### End-to-end smoke test (real models, real backend)

```bash
uv run python samples/generate_knife_clip.py
uv run python scripts/smoke_e2e.py
```

Starts a throwaway instance on port 8011 playing `samples/knife_demo.mp4`
once, and passes when the backend has opened a docket with both evidence
images. **It writes a real incident, docket, alert and operator
notifications to whatever database `apps/server` uses** — close the docket
afterwards.
