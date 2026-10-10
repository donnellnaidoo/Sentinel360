# apps/ai — Sentinel360 CCTV AI pipeline (demo scope)

Single-stream computer vision pipeline: weapon detection, SlowFast anomaly
detection, face crops on every docket, plus opt-in pose-based altercation
detection and watchlist face matching. On a trigger it posts a structured event to the existing
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

Download the ready-made models into `models/` (gitignored — never commit
them). One command, pinned versions, checksums verified, and it never
replaces a file you already have:

```bash
uv run python scripts/download_models.py
```

| File | Used by |
|---|---|
| `models/yolov8n.pt` | `app/pipeline/weapon.py` — knives + persons (stock COCO) |
| `models/threat_yolov8n.pt` | `app/pipeline/weapon.py` — **guns**, via a public YOLOv8n threat model ([Subh775/Threat-Detection-YOLOv8n](https://huggingface.co/Subh775/Threat-Detection-YOLOv8n), MIT). Only its `Gun` class is used; knives stay with `yolov8n.pt`, which scored them better on X3 footage |
| `models/face_detection_yunet_2023mar.onnx` | `app/pipeline/faces.py` — face crops attached to each docket |
| `models/face_recognition_sface_2021dec.onnx` | `app/pipeline/watchlist.py` — only if `FACE_RECOGNITION_ENABLED` |
| `models/yolo11n-pose.pt` | `app/pipeline/pose.py` — only if `POSE_ENABLED` |
| plate detector + reader (in `~/.cache`) | `app/pipeline/plates.py` — only if `ALPR_ENABLED`. [fast-alpr](https://github.com/ankandrew/fast-alpr) (MIT); fetched and checksum-verified by the script |
| `models/slowfast_ucfcrime_binary.pth` | SlowFast anomaly detection (experimental, uncalibrated for X3) — **not public**: copy it from the model team's handoff (`sentinal360-AI-model_Integration.zip`, `py-weight/`) |

Any model that's missing is skipped and `/stream/status` says why
(`weapons.extra_model_unavailable`, `faces.reason`, ...) — the rest of the
pipeline still runs. The gun model adds ~50 ms per 4-view frame on an
M-series Mac (X3: ~13 -> ~9 fps uncapped, still above `TARGET_FPS=5`); set
`WEAPON_EXTRA_MODEL_PATH=` (empty) to run knives only.

`pytorchvideo` is installed from git by `uv sync`, so SlowFast builds
locally — no `torch.hub` GitHub fetch at runtime.

### Face crops

When an event fires (knife, anomaly or panic button), YuNet runs on the clean
views of that frame and every face it finds — in every view, largest first,
up to `FACE_MAX_PER_EVENT` (5) — is sent as `FACE` media. The backend stores
each one as evidence on the event's case ("AI face capture 1", "2", ...), with
its view, box and score in `metadata.faces` / `metadata.faceNumber`.

This is detection only: no embeddings, no identity, nothing linked across
cases. It also captures bystanders. These are biometric images (special
personal information under POPIA), so set `FACE_ENABLED=false` where that
isn't justified, and treat them under the same retention rules as other
case evidence.


## Improving accuracy

Measure first, then change one thing at a time — see `eval/README.md`:

1. **Measure.** Record labelled clips (`scripts/record_clip.py`), then
   `scripts/evaluate.py run` reports recall, precision, false alarms per
   hour and time to detect; `sweep` finds the alarm settings that would
   have done best; `calibrate` sets the SlowFast threshold from normal
   footage.
2. **Fine-tune the weapon model.** `scripts/export_frames.py` turns your
   clips into the views the detector sees, for labelling;
   `scripts/train_weapon.py` fine-tunes YOLO11 on a public weapon dataset
   plus those frames (knife, pistol, rifle) and prints the `.env` lines to
   switch to it. The stock `yolov8n.pt` is never touched.
3. **Switch on the optional rules** below if the evaluation says they help.

Every option below is off (or at its original value) by default, except
gun detection, which runs whenever `models/threat_yolov8n.pt` is present.

| Setting | Default | What it does |
|---|---|---|
| `WEAPON_ALARM_LABELS` | `["knife"]` | Classes that raise a weapon alarm (JSON list). A fine-tuned model adds e.g. `"pistol"`. |
| `WEAPON_EXTRA_MODEL_PATH` | `models/threat_yolov8n.pt` | Second, ready-made model for classes the main one lacks (guns). Empty = knives only. |
| `WEAPON_EXTRA_LABELS` | `["Gun"]` | Which of the extra model's classes raise alarms (reported lower-case, e.g. `gun`). |
| `WEAPON_PERSON_MODEL_PATH` | empty | COCO model for person boxes when the weapon model has no person class (e.g. `models/yolov8n.pt`). |
| `WEAPON_REQUIRE_PERSON` | `false` | Only alarm on a weapon near a person — knives lying on a counter don't fire. |
| `KNIFE_WINDOW_FRAMES` | `3` | Alarm when the weapon is in `KNIFE_CONSECUTIVE_REQUIRED` of the last N frames. `5` lets one missed frame through. |
| `DETECT_INPUT_SIZE` | `640` | YOLO input size. `960` finds smaller knives, ~2x slower. |
| `ANOMALY_CLIP_SECONDS` | `0` | SlowFast clip length in real seconds. `0` = last 32 processed frames (~6.4 s at 5 fps, vs ~1 s in training). `1.5` takes frames straight from the camera at its own rate. |
| `ANOMALY_VIEW_MODE` | `composite` | `per_view` scores each X3 view at full 224 px instead of four views squashed into one (~3x slower; it just scores less often); `per_view_people` only views with someone in them. |
| `POSE_ENABLED` | `false` | YOLO11n-pose + rules (fast strikes between people close together, falls) raise `ALTERCATION`. Experimental. |
| `FACE_RECOGNITION_ENABLED` | `false` | Match faces on each event against wanted persons' photos (fetched from the backend). Matches are suggestions for an officer to verify. |
| `ALPR_ENABLED` | `false` | Read licence plates on vehicles and raise `PLATE_MATCH` for plates on a wanted profile (`knownPlateNumbers`). See below. |
| `ALPR_SCAN_FULL_VIEW` | `false` | Also read plates when no vehicle is detected — for a printed plate held up in a demo, or a car too close to be recognised. |
| `FACE_WATCHLIST_SCAN` | `false` | Also check every 5th frame for watchlisted faces and raise `WATCHLIST_MATCH` (once per person per 5 min). |

### Licence plates (ALPR)

With `ALPR_ENABLED=true`, every 2nd processed frame the vehicles the weapon
model finds (car, motorcycle, bus, truck) are cropped and their plates read
by fast-alpr (~12 ms a plate on an M-series Mac). Readings are compared with
the plates on active wanted profiles (`entity_profile.knownPlateNumbers`,
via `GET /internal/ai/watchlist`, refreshed every 5 minutes). Spacing and
punctuation are ignored and look-alike characters (O/0, I/1, B/8, S/5, ...)
compare equal, so `CA 1O3-456` on a profile matches a reading of `CA103456`.

A wanted plate must be read twice within 10 s before it raises
`PLATE_MATCH` (once per plate per 5 minutes), with the snapshot and a
close-up of the vehicle, for an officer to verify. **Every other reading is
discarded on the spot** — it is never stored, logged or sent, and
`/stream/status` only counts them. If no profile has a plate, no plates are
read at all.

Expect it to work on slow or parked vehicles a few metres from the camera.
A 360° camera gives a distant plate too few pixels to read; for a gate or
road, point a separate camera (`STREAM_SOURCE`, e.g. a phone) at it.

### Watchlist matching and POPIA

Face matching is biometric processing of special personal information.
Only switch it on where there is a lawful basis, and treat every match as a
lead: the backend records it as an `entity_match` suggestion and the alert
says an officer must verify the identity — nothing is linked or acted on
automatically. The gallery is `GET /internal/ai/watchlist`: active wanted
persons with a photo, refreshed every 5 minutes.

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
  (device, clip mode, last probability, streak), pose and watchlist state,
  queued/dropped/recent events

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
