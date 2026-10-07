# AI Model Integration Plan — SentinelSecure → `apps/ai`

> **Source:** `sentinal360-AI-model_Integration.zip` (model team handoff, Oct 2026)
> **Target:** `apps/ai` (FastAPI service) → `apps/server` `POST /internal/ai/events` → web/native alerts + dockets
> **Status:** Phases A–E implemented (Oct 2026) — see §9 for results and follow-ups

---

## 1. What we're integrating

| Component | From the zip | Notes |
|---|---|---|
| YOLOv8n (`yolov8n.pt`, 6.5 MB) | `webcam/weapondetection.py` | Stock COCO weights — **knife** is the only weapon class. No firearms. |
| SlowFast r50 binary (`slowfast_ucfcrime_binary.pth`, 135 MB) | `webcam/anomaly_detector.py` | UCF-Crime fine-tune, ~82% val acc. **Model author says it is not calibrated for X3.** |
| X3 360° capture | `weapondetection.py` (`receive_x3_frame`, `create_perspective_map`) | TCP from `Sentinel360X3Stitcher.exe` (Windows, **not in zip**) on `127.0.0.1:5001`. Header `!III` (w, h, payload) + 960×480 RGB. Dewarped to 4 × 480×360 views (Front/Right/Rear/Left, FOV 100°). |
| Confirmation logic | `weapondetection.py` | Knife: conf ≥ 0.45, 3 consecutive frames **in the same view**, or conf ≥ 0.85 bypass, 5 s cooldown. Anomaly: p ≥ 0.60 for 3 consecutive **fresh** results, one alarm per continuous event, re-arms when p drops. |
| Evidence capture | `save_snapshot`, `save_knife_crop` | Annotated 4-view snapshot + clean crop from `raw_views` (pre-annotation). |

**Dropped (desktop-only / test tooling):** `cv2.imshow` window, pygame `alarm.mp3`, `n/x/c` keyboard test annotations, `*_WORKING_BACKUP.py`, `test_x3_*.py`, CSV logs + sample snapshots (replaced by structured logging + backend events).

## 2. What already exists (don't rebuild)

- `apps/ai/app/pipeline/capture.py` — `StreamCapture` (RTSP reconnect / looped file).
- `apps/ai/app/pipeline/detector.py` — YOLO11n person/vehicle + ByteTrack.
- `apps/ai/app/pipeline/pipeline.py` — `PipelineRunner` background thread, latest JPEG, MJPEG via `/stream/mjpeg`.
- `apps/server/src/index.ts` — `POST /internal/ai/events` (shared-secret `X-Internal-Api-Key`).
- `packages/api/src/services/ai-ingest.ts` — `ingestAiEvent` → incident + `AI_GENERATED` case + alert + IN_APP notifications + audit log.
- `packages/api/src/services/evidence-storage.ts` (`uploadEvidenceFile`) + `chain-of-custody.ts` (`recordCustodyEvent`, `sha256Hex`) + `media_asset.sourceCameraId`.

## 3. Decisions (agreed)

1. **Camera sources:** support all three behind one interface — looped file (default, runs on the Mac), IP/RTSP/HTTP-MJPEG, and X3 TCP. X3 demo runs on the Windows box with the stitcher.
2. **Anomaly → full docket**, same as weapons (incident + case + alert). Mitigation for the known false-positive rate is in §7.
3. **Evidence:** confirmed detections upload snapshot + clean crop as case evidence with chain-of-custody.

---

## 4. Phases

### Phase A — Port the model code into `apps/ai` (Python)

**A1. Weights & deps**
- Copy weights into `apps/ai/models/` (already gitignored): `yolov8n.pt`, `slowfast_ucfcrime_binary.pth`. Do **not** commit — add a `scripts/fetch-models` note / shared-drive link to the README.
- `pyproject.toml`: add `torch`, `torchvision`, `pillow`, and `pytorchvideo` (install from git — the PyPI 0.1.5 release is stale) + `fvcore`, `iopath`. Remove the runtime `torch.hub.load(...)` GitHub fetch: build via `pytorchvideo.models.hub.slowfast_r50(pretrained=False)` so first run needs no network.
- Drop `cvzone` / `pygame` (draw with plain cv2 like the existing `_draw_overlays`).

**A2. Capture sources** — extend `capture.py`
- Add `X3TcpCapture` (port `receive_exact` / `receive_x3_frame`, RGB→BGR) implementing the same `read() -> Frame | None` + reconnect behaviour.
- Source selection by URL scheme: `x3tcp://127.0.0.1:5001`, `rtsp://` / `http://…/video`, else file path. HTTP IP-cam gets the RTSP reconnect path (current `_is_rtsp` check misses it).
- Add `Frame.views: dict[str, np.ndarray]` — X3 fills 4 views; single-view sources fill `{"Main": image}`.

**A3. Dewarp** — new `app/pipeline/dewarp.py`
- Port `create_perspective_map` verbatim; precompute the 4 maps once per pano size (lazy on first frame — don't hard-code 960×480).

**A4. Weapon detector** — new `app/pipeline/weapon.py`
- Batched `model.predict(list_of_views)` with yolov8n, `conf=0.10` display threshold.
- Port per-view knife streaks / high-conf bypass / global 5 s cooldown into a pure, unit-testable `KnifeConfirmer` class (no I/O).
- On confirm emit a `WeaponEvent(view, conf, bbox, method, streak)` + clean crop from the **raw** view (20% padding).
- Decide: keep YOLO11n person/vehicle tracker running alongside, or fold person tracking into the yolov8n pass (cheaper on CPU — **recommended**: one yolov8n `track()` per view for person + knife, drop the separate YOLO11n call).

**A5. Anomaly detector** — `app/pipeline/anomaly.py`
- Port `SlowFastAnomalyDetector` as-is (background worker, `update()` returns only fresh results — **do not change that contract**).
- Input: 2×2 composite of 224×224 raw views (X3) or the raw frame (single-view).
- Port streak/re-arm logic into a pure `AnomalyConfirmer`.
- Env flag `ANOMALY_ENABLED` so the pipeline still runs if the checkpoint is missing or the CPU can't keep up.

**A6. Pipeline wiring** — `pipeline.py`
- Loop: capture → views → keep `raw_views` copies → YOLO batch → confirmers → anomaly `update(composite.copy())` → overlays → 2×2 display JPEG.
- **Never block the capture loop on HTTP:** confirmed events go onto a `queue.Queue` consumed by an `EventPublisher` thread.
- Extend `/stream/status` with `last_anomaly_prob`, knife streaks, events sent/failed.

**A7. Config** — `config.py` (replaces the zip's hard-coded constants)
`stream_source`, `weapon_model_path`, `slowfast_model_path`, `knife_conf_alarm=0.45`, `knife_consecutive=3`, `knife_high_conf_bypass=0.85`, `weapon_cooldown_s=5`, `anomaly_enabled`, `anomaly_threshold=0.60`, `anomaly_consecutive=3`, `anomaly_inference_stride=8`, `x3_view_fov=100`, `x3_view_size=480x360`. Add `.env.example`.

### Phase B — Backend: events with evidence

**B1. Event type** — `ai-ingest.ts`
- Add `ANOMALY_DETECTED` to `AI_EVENT_TYPES`; severity **HIGH** (weapon stays CRITICAL). Title prefixed "Possible anomalous activity" and `metadata.modelStatus: "experimental"` so investigators see it's uncalibrated.

**B2. Media on ingest** — `apps/server/src/index.ts` + `ai-ingest.ts`
- Extend schema with optional `media: [{ kind: "SNAPSHOT" | "CROP", mimeType: "image/jpeg", dataBase64 }]` (max 2, ≤ 2 MB each; keeps the route JSON + shared-secret, no multipart).
- For each: `uploadEvidenceFile` → `media_asset` row (`source: "ai_pipeline"`, `sourceCameraId`, `fileHash = sha256Hex`, `status: "READY"`, metadata: view/bbox/conf/model) → `case_evidence` link → `recordCustodyEvent(action: "COLLECTED", reason: "Auto-captured by AI pipeline")` → `recordCaseEvent("EVIDENCE_ADDED")`.
- Raise Hono body limit for this route only.
- Wrap incident/case/alert inserts in a transaction; upload media **after** commit and log (don't fail the event) if storage errors.

**B3. Idempotency** — `metadata.eventId` (UUID from Python); skip if an incident already has it, so publisher retries don't create duplicate dockets.

### Phase C — Python → backend publisher

- `app/events/publisher.py`: httpx POST with `X-Internal-Api-Key`, 3 retries with backoff, bounded queue (drop oldest + log if the backend is down).
- Payload: `cameraId`, `eventType`, `confidence`, `occurredAt`, `summary`, `location` (from camera config), `metadata` (`eventId`, `view`, `bbox`, `confirmationMethod`, `streak`, `model`, `modelVersion`), `media`.

### Phase D — Frontend surfacing

- **Web docket** `EvidenceTab.tsx`: AI evidence badge (camera, view, confidence, model), crop shown next to the snapshot.
- **Web alerts / dashboard**: `ANOMALY_DETECTED` style + "Experimental model" chip; make sure `ai_pipeline` alerts link to the auto-docket.
- **Web live monitor** (new `(dashboard)/monitoring` page, operator/admin only): `<img src={AI_URL}/stream/mjpeg>` + start/stop + status panel. Needs CORS on the FastAPI app and `NEXT_PUBLIC_AI_SERVICE_URL`.
- **Native**: no new screens — alerts already arrive via notifications; check the alert detail renders the AI types.

### Phase E — Tests & validation

- Pytest: `KnifeConfirmer` (streak reset per view, bypass, cooldown), `AnomalyConfirmer` (3 fresh results, one alarm per event, re-arm), X3 frame parser against a fake TCP server, dewarp map shapes, publisher retry/idempotency.
- Server: ingest with media → media_asset + custody row + case link; duplicate `eventId` → no second case; bad key → 401.
- End-to-end smoke: looped sample clip with a knife → docket with 2 evidence items appears in web within ~5 s.
- Record CPU FPS on the Mac with anomaly on and off; tune `anomaly_inference_stride`.

---

## 5. File map

```
apps/ai/
  app/config.py                 (extend)
  app/main.py                   (CORS, extended status)
  app/pipeline/capture.py       (X3 TCP + HTTP cam + views)
  app/pipeline/dewarp.py        (new — from zip)
  app/pipeline/weapon.py        (new — from zip, KnifeConfirmer)
  app/pipeline/anomaly.py       (new — from zip, AnomalyConfirmer)
  app/pipeline/pipeline.py      (rewire)
  app/events/publisher.py       (new)
  models/{yolov8n.pt,slowfast_ucfcrime_binary.pth}  (gitignored)
  tests/test_{weapon,anomaly,x3_capture,publisher}.py
packages/api/src/services/ai-ingest.ts   (ANOMALY_DETECTED, media, idempotency, tx)
apps/server/src/index.ts                 (schema + body limit)
apps/web/src/app/(dashboard)/monitoring/page.tsx  (new)
apps/web/.../docket/[docketId]/_components/EvidenceTab.tsx
apps/web/src/app/(dashboard)/alerts/page.tsx
```

## 6. Suggested order

A1 → A2/A3 → A4 → C + B1–B3 (weapon events end-to-end: **first demoable milestone**) → A5/A6 anomaly → D → E (tests written alongside each step).

## 7. Risks

| Risk | Mitigation |
|---|---|
| **Anomaly dockets are false positives** (author: uncalibrated, normal/staged overlap) | Keep the 3-result confirmation + one-alarm-per-event; HIGH not CRITICAL; "experimental" metadata visible in UI; `ANOMALY_ENABLED` kill switch; don't tune the threshold just to make a demo pass (author's explicit note). |
| SlowFast on Mac CPU is slow | Background worker already skips stale clips; raise stride; try `mps` device; the flag can disable it. |
| X3 stitcher is Windows-only, not in the zip | Get the `.exe` + its setup from the model team; file/IP sources cover Mac dev. |
| 135 MB weights | Never in git; document the download location. |
| pytorchvideo packaging / torch.hub network fetch | Install from git and build the model locally (A1). |
| Backend down mid-demo | Async publisher queue + retries + `eventId` idempotency. |
| Only knives detected | Out of scope; firearms need a custom-trained model (noted in the zip roadmap). |

## 8. Open questions for the model team

1. Where do we get `Sentinel360X3Stitcher.exe` and what does its setup involve?
2. Can we have the training-notebook cell for the SlowFast head, to confirm the checkpoint loads with `pretrained=False` + `Linear(in, 2)`?
3. Is there a validation clip set (normal vs staged) we can use as a regression test for the anomaly threshold?

---

## 9. Results and follow-ups (after Phase E)

**Verified**
- `bun run test` passes across ai (pytest), server (route tests) and api (vitest).
- `apps/ai/scripts/smoke_e2e.py` on hosted Supabase: knife confirmed at 0.62 by
  3-frame persistence → docket with snapshot + crop, custody rows, timeline,
  alert and notifications.
- Throughput on an M-series Mac with YOLO on MPS: X3 4-view + anomaly 6.5 fps
  (3.4 on CPU); table in `apps/ai/README.md`.
- Ingest: alert lands ~2.5 s after the backend receives an event (was 6–8 s
  before raising the alert ahead of evidence); full docket ~10 s.

**Deviations from the plan**
- No DB transaction in ingest: the case/timeline/audit helpers each write via
  the shared `db`, and the audit log is hash-chained by read-then-insert, so
  writes must stay sequential anyway. Retries resume a half-ingested event
  instead (idempotency via `INC-AI-<eventId>`).
- Live loop drops YOLO11n person/vehicle tracking (one yolov8n pass for
  person + knife across views). `detector.py` is kept for ALPR work.
- Live Monitor is proxied through `apps/web` `/api/ai/*` (session + console
  role); the AI service requires the shared key on `/stream/*`.

**Follow-ups**
1. **Weapon events open a docket every 5 s while a knife stays in view.** The
   5 s cooldown is the model team's alarm-sound cooldown. Needs an event
   window per camera (e.g. later confirmations within 60 s attach to the open
   docket instead of opening a new one).
2. **Anomaly calibration per camera** — frame-rate resampling to the training
   clip length, per-view clips instead of the 2x2 composite, and a learning
   mode that sets each camera's threshold from its own normal footage at a
   target false-alarm rate.
3. **Audit log chain is racy under concurrent requests app-wide**
   (`recordAuditEvent` reads the latest hash, then inserts). Pre-existing;
   two simultaneous writers can fork the chain.
4. `uploadEvidenceFile` validates type/size *after* uploading (manual upload
   path). AI ingest validates first; the manual path should too.
