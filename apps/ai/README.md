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

Face recognition (buffalo_s), ALPR (PaddleOCR mobile models), and the weapon
detector are added in later phases — see this repo's task tracker for
current status; their setup steps will be added here as they land.

## Configuration

Copy `.env.example` to `.env` (create one if it doesn't exist yet) and set:

| Var | Purpose |
|---|---|
| `STREAM_SOURCE` | `rtsp://...` for a live camera, or a local file path (e.g. `samples/demo.mp4`) to loop as the demo stream |
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
- `GET /stream/mjpeg` — live preview with detection overlays (added once the
  capture/detection pipeline lands)

## CPU performance strategy

This runs on a laptop CPU, not a GPU edge node — the numbers in the main
architecture doc do not apply here. Detection + tracking runs on every
processed frame at a reduced resolution (~640px) targeting ~5 FPS. Heavier
stages (face recognition, ALPR, weapon detection) run at a lower cadence —
periodically, or only for newly-tracked persons/vehicles — to stay usable in
real time. This is a demo-scale tradeoff, not a production throughput target.
