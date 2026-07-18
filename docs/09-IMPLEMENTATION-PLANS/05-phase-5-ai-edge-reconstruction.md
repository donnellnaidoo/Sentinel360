# Phase 5: AI — Detection, Tracking & Reconstruction

> **Sentinel360 Implementation Plan — Phase 5**
> **Version:** 1.0 | **Last Updated:** June 2026
> **Estimated Effort:** 6–8 weeks / 240–320 person-hours
> **Dependencies:** Phase 2 (Profiles & Cases), Phase 3 (Evidence & Sightings)

---

## 1. Objective

Implement the AI/ML pipeline that powers Sentinel360's core intelligence capabilities: real-time behaviour detection, facial recognition, automatic licence plate recognition (ALPR), entity re-identification (Re-ID), movement path tracking, and 3D crime scene reconstruction. This phase connects the AI inference engine with the evidence and profile domains, enabling automated suspect identification, alert triggering, and spatial reconstruction from surveillance footage.

**Corresponding Requirements:**
- **US-08** — Auto Capture Snapshot (AI/CCTV System)
- **US-09** — Assign Confidence Score (AI/CCTV System)
- **§5.1** — Real-Time AI Behaviour Detection (class-specific detection, continuous inference, threat triggering)
- **§5.2** — Automated Entity Attribute Extraction (biometric, physical description, vehicular data)
- **§5.3** — Movement Path Tracking & Re-identification (inter-camera Re-ID, chronological spatial mapping)
- **§5.4** — 3D Crime Scene Reconstruction (spatial synthesis, 360-degree forensic models)
- **§6.1** — System Performance and Scalability (sub-second alerting, elastic compute)
- **§6.2** — Processing Accuracy and Evidentiary Quality (95% confidence threshold)

---

## 2. Key Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | **Database — AI & Edge schema** | AI model versions, inference results, entity profiles, face detection records, plate detection, entity tracks, movement paths, reconstruction jobs, reconstruction models, edge nodes |
| 2 | **Python AI microservice** | FastAPI-based service for YOLOv8/PyTorch inference, facial recognition, ALPR |
| 3 | **AI orchestration service (Node.js)** | Queue management, job dispatch, result ingestion, webhook delivery |
| 4 | **Model registry & lifecycle management** | Upload, version, promote, deprecate AI models |
| 5 | **Face detection & recognition pipeline** | Detect faces in frames, extract embeddings, match against wanted profiles |
| 6 | **ALPR pipeline** | License plate detection, OCR, vehicle make/model/colour classification |
| 7 | **Behaviour anomaly detection** | Baseline learning, deviation scoring, threat classification |
| 8 | **Entity re-identification (Re-ID) service** | Cross-camera entity matching, persistent track IDs |
| 9 | **Movement path tracking** | Chronological entity pathing, spatial mapping, trajectory export |
| 10 | **3D scene reconstruction pipeline** | Multi-view 360-video synthesis, point cloud generation, mesh creation |
| 11 | **Web: AI confidence viewer** | Dashboard showing AI analysis results with confidence scores |
| 12 | **Web: Entity tracking map** | Visual entity movement paths overlaid on map |
| 13 | **Web: 3D reconstruction viewer** | Interactive 3D scene viewer (WebGL/Three.js) |
| 14 | **Mobile: AI analysis status** | Real-time status of submitted media analysis |

---

## 3. Database Tables

### 3.1 Schema Additions

| Table | Purpose | Dependencies |
|-------|---------|--------------|
| `ai_model_versions` | Model registry (versioned ML models) | `users` (promoted_by) |
| `ai_inference_results` | Raw inference output from AI models | `ai_model_versions`, `evidence`, `criminal_profiles` |
| `entity_profiles` | Persistent entity profiles (person, vehicle) | `criminal_profiles` (optional) |
| `entity_attributes` | Extracted attributes for entities (clothing, vehicle features) | `entity_profiles` |
| `face_detections` | Face detection records from video frames | `evidence`, `ai_inference_results` |
| `face_matches` | Face match results against wanted profiles | `face_detections`, `criminal_profiles` |
| `plate_detections` | License plate detection records | `evidence`, `ai_inference_results` |
| `plate_matches` | Plate match results against wanted vehicles | `plate_detections`, `criminal_profiles` |
| `entity_tracks` | Persistent entity tracks across cameras | `entity_profiles` |
| `track_segments` | Individual track segments per camera view | `entity_tracks` |
| `track_camera_transitions` | Inter-camera transition records | `entity_tracks` |
| `movement_paths` | Synthesized movement paths for entities | `entity_tracks`, `cases` |
| `movement_path_points` | Individual path GPS/time points | `movement_paths` |
| `reconstruction_jobs` | 3D reconstruction job queue and status | `evidence`, `cases` |
| `reconstruction_models` | Generated 3D models (point clouds, meshes) | `reconstruction_jobs` |
| `edge_nodes` | Registered edge inference nodes (cameras) | `organizations` |
| `edge_node_heartbeats` | Edge node health and status logs | `edge_nodes` |

### 3.2 Key Tables Detail

#### `ai_model_versions`
```sql
CREATE TABLE ai_model_versions (
    id                  TEXT PRIMARY KEY,
    model_name          VARCHAR(100) NOT NULL,  -- face_detection, face_recognition, alpr, behaviour, reid, reconstruction
    model_framework     VARCHAR(50),            -- PyTorch, TensorFlow, ONNX
    version             VARCHAR(50) NOT NULL,
    description         TEXT,
    
    -- Performance
    accuracy            DECIMAL(5,2),
    precision           DECIMAL(5,2),
    recall              DECIMAL(5,2),
    f1_score            DECIMAL(5,2),
    latency_ms          DECIMAL(10,2),
    
    -- Artifacts
    model_s3_key        VARCHAR(512),
    model_sha256        VARCHAR(64),
    config_json         JSONB,
    
    -- Lifecycle
    status              VARCHAR(30) NOT NULL DEFAULT 'staging',  -- development, staging, production, deprecated, archived
    promoted_by         TEXT REFERENCES users(id),
    promoted_at         TIMESTAMPTZ,
    deprecated_at       TIMESTAMPTZ,
    
    -- Lineage
    parent_model_id     TEXT REFERENCES ai_model_versions(id),
    training_dataset_id VARCHAR(200),
    training_notes      TEXT,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(model_name, version)
);
```

#### `ai_inference_results`
```sql
CREATE TABLE ai_inference_results (
    id                  TEXT PRIMARY KEY,
    model_version_id    TEXT NOT NULL REFERENCES ai_model_versions(id),
    evidence_id         TEXT REFERENCES evidence(id),
    profile_id          TEXT REFERENCES criminal_profiles(id),
    
    detection_class     VARCHAR(100),           -- person, vehicle, face, license_plate, abnormal_activity
    detection_confidence DECIMAL(5,2) NOT NULL,
    bounding_box        JSONB,
    
    match_profile_id    TEXT REFERENCES criminal_profiles(id),
    match_confidence    DECIMAL(5,2),
    
    embedding_vector    DOUBLE PRECISION[],     -- 512-dim vector (pgvector if available)
    
    source_camera_id    VARCHAR(200),
    source_frame_timestamp TIMESTAMPTZ,
    raw_output          JSONB,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `entity_tracks`
```sql
CREATE TABLE entity_tracks (
    id              TEXT PRIMARY KEY,
    entity_profile_id TEXT REFERENCES entity_profiles(id),
    criminal_profile_id TEXT REFERENCES criminal_profiles(id),
    track_id        VARCHAR(100) NOT NULL,     -- human-readable persistent ID
    source          VARCHAR(50) NOT NULL,      -- ai_reid, manual_link
    
    first_seen_at   TIMESTAMPTZ NOT NULL,
    last_seen_at    TIMESTAMPTZ NOT NULL,
    first_camera_id VARCHAR(200),
    last_camera_id  VARCHAR(200),
    
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `reconstruction_jobs`
```sql
CREATE TABLE reconstruction_jobs (
    id              TEXT PRIMARY KEY,
    case_id         TEXT REFERENCES cases(id),
    evidence_ids    TEXT[],                     -- source video evidence IDs
    
    status          VARCHAR(30) NOT NULL DEFAULT 'queued',  -- queued, processing, completed, failed
    progress        DECIMAL(5,2) DEFAULT 0,
    
    -- Configuration
    reconstruction_type VARCHAR(50) NOT NULL,   -- 360_photogrammetry, multi_view_stereo, neural_radiance_field
    quality_preset      VARCHAR(30) DEFAULT 'standard',  -- draft, standard, high
    
    -- Output
    output_model_id TEXT REFERENCES reconstruction_models(id),
    error_message   TEXT,
    
    created_by      TEXT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);
```

#### `edge_nodes`
```sql
CREATE TABLE edge_nodes (
    id              TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    name            VARCHAR(200) NOT NULL,
    location        GEOGRAPHY(Point, 4326),
    
    camera_id       VARCHAR(200) NOT NULL UNIQUE,
    camera_type     VARCHAR(50),                -- 360, ptz, fixed
    resolution      VARCHAR(20),
    firmware_version VARCHAR(100),
    
    status          VARCHAR(30) NOT NULL DEFAULT 'offline',  -- online, offline, degraded
    last_heartbeat  TIMESTAMPTZ,
    
    ai_capabilities TEXT[],                     -- face_detection, alpr, behaviour
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 Prisma Schema Updates

Add to `packages/db/prisma/schema.prisma`:
- `AiModelVersion`, `AiInferenceResult`
- `EntityProfile`, `EntityAttribute`
- `FaceDetection`, `FaceMatch`
- `PlateDetection`, `PlateMatch`
- `EntityTrack`, `TrackSegment`, `TrackCameraTransition`
- `MovementPath`, `MovementPathPoint`
- `ReconstructionJob`, `ReconstructionModel`
- `EdgeNode`, `EdgeNodeHeartbeat`

Note: `DOUBLE PRECISION[]` for embedding vectors; if pgvector extension is available, use `vector(512)` via raw SQL.

---

## 4. API Endpoints

### 4.1 AI Analysis Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `POST`   | `/api/v1/ai/analyze` | Submit media for AI analysis | security, law_enforcement, admin |
| `GET`    | `/api/v1/ai/analyze/{jobId}` | Check analysis status | security, law_enforcement, admin |
| `POST`   | `/api/v1/ai/face-compare` | Compare face to wanted profiles | law_enforcement, admin |
| `POST`   | `/api/v1/ai/batch-analyze` | Submit batch of media for analysis | admin, super_admin |

### 4.2 Model Management Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/ai/models` | List AI model versions | admin, super_admin |
| `POST`   | `/api/v1/ai/models` | Register new model version | super_admin |
| `GET`    | `/api/v1/ai/models/{id}` | Get model details | admin, super_admin |
| `POST`   | `/api/v1/ai/models/{id}/promote` | Promote model to production | super_admin |
| `POST`   | `/api/v1/ai/models/{id}/deprecate` | Deprecate model version | super_admin |
| `GET`    | `/api/v1/ai/models/active` | Get active production models | admin, super_admin |

### 4.3 Entity Tracking Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/tracking/entities` | List active entity tracks | law_enforcement, admin |
| `GET`    | `/api/v1/tracking/entities/{id}` | Get entity track details | law_enforcement, admin |
| `GET`    | `/api/v1/tracking/entities/{id}/path` | Get movement path (GeoJSON) | law_enforcement, admin |
| `GET`    | `/api/v1/tracking/entities/{id}/transitions` | Get camera transitions | law_enforcement, admin |
| `POST`   | `/api/v1/tracking/link` | Manually link track to criminal profile | admin, super_admin |
| `GET`    | `/api/v1/tracking/search` | Search entity tracks by attributes | law_enforcement, admin |

### 4.4 3D Reconstruction Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `POST`   | `/api/v1/reconstruction` | Submit reconstruction job | law_enforcement, admin |
| `GET`    | `/api/v1/reconstruction` | List reconstruction jobs | law_enforcement, admin |
| `GET`    | `/api/v1/reconstruction/{id}` | Get job status and result | law_enforcement, admin |
| `GET`    | `/api/v1/reconstruction/{id}/model` | Download reconstructed model | law_enforcement, admin |
| `GET`    | `/api/v1/reconstruction/{id}/view` | Get viewer URL for 3D model | law_enforcement, admin |

### 4.5 Edge Node Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/edge/nodes` | List registered edge nodes | admin, super_admin |
| `POST`   | `/api/v1/edge/nodes` | Register edge node | admin, super_admin |
| `PATCH`  | `/api/v1/edge/nodes/{id}` | Update edge node config | admin, super_admin |
| `GET`    | `/api/v1/edge/nodes/{id}/health` | Get node health history | admin, super_admin |
| `GET`    | `/api/v1/edge/nodes/{id}/stats` | Get node inference statistics | admin, super_admin |

### 4.6 AI System Endpoints (Internal)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST`   | `/api/v1/internal/ai/result` | AI service posts inference result | API key |
| `POST`   | `/api/v1/internal/edge/heartbeat` | Edge node heartbeat | API key |
| `POST`   | `/api/v1/internal/edge/detection` | Edge node submits detection | API key |

---

## 5. Python AI Microservice (FastAPI)

### 5.1 Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Node.js API Gateway                    │
│  - Receives media → queues analysis job                 │
│  - Polls for results → stores in PostgreSQL             │
│  - Triggers alerts on high-confidence matches           │
└──────────┬──────────────────────────────────────────────┘
           │ Redis Queue (Bull)
           ▼
┌─────────────────────────────────────────────────────────┐
│              Python AI Microservice (FastAPI)            │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────┐             │
│  │ Face Detection   │  │ ALPR Pipeline    │             │
│  │ (YOLOv8 + ArcFace)│  │ (YOLOv8 + OCR)   │             │
│  └─────────────────┘  └──────────────────┘             │
│  ┌─────────────────┐  ┌──────────────────┐             │
│  │ Behaviour        │  │ Re-ID Service    │             │
│  │ Anomaly Detection│  │ (OSNet + FAISS)  │             │
│  └─────────────────┘  └──────────────────┘             │
│  ┌────────────────────────────────────────┐             │
│  │ 3D Reconstruction (COLMAP + NeRF)      │             │
│  └────────────────────────────────────────┘             │
│                                                         │
│  Results → POST /api/v1/internal/ai/result              │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Pipeline Modules

| Module | Models | Input | Output |
|--------|--------|-------|--------|
| **Face Detection** | YOLOv8n-face, RetinaFace | Video frame / image | Bounding boxes, landmarks, quality score |
| **Face Recognition** | ArcFace-R100, MobileFaceNet | Cropped face image | 512-dim embedding, match score |
| **ALPR** | YOLOv8-license-plate, CRNN+CTC | Vehicle image | Plate text, confidence, vehicle attributes |
| **Behaviour Detection** | SlowFast, I3D | Video clip (16-64 frames) | Activity class, anomaly score, temporal bounds |
| **Re-Identification** | OSNet, ResNet50-ReID | Person crop | 512-dim Re-ID embedding, similarity score |
| **3D Reconstruction** | COLMAP + NeRF/PixelSplat | Multi-view video | Point cloud, textured mesh, camera poses |

### 5.3 FastAPI Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET`    | `/health` | Service health | API key |
| `POST`   | `/analyze/face` | Face detection + recognition | API key |
| `POST`   | `/analyze/alpr` | License plate recognition | API key |
| `POST`   | `/analyze/behaviour` | Behaviour anomaly detection | API key |
| `POST`   | `/analyze/reid` | Person re-identification | API key |
| `POST`   | `/analyze/full` | Full analysis pipeline | API key |
| `POST`   | `/reconstruct` | Submit 3D reconstruction job | API key |
| `GET`    | `/reconstruct/{jobId}` | Reconstruction progress | API key |
| `POST`   | `/models/load` | Load/evaluate model version | API key |
| `GET`    | `/models/loaded` | List loaded models | API key |

---

## 6. Frontend Components (Web — Next.js)

### 6.1 Route Structure

| Route | Component | Description | Auth |
|-------|-----------|-------------|------|
| `/ai/dashboard` | `AIDashboardPage` | AI analysis overview, confidence metrics | law_enforcement+ |
| `/ai/analysis/{jobId}` | `AIAnalysisDetailPage` | Single analysis result with visualisation | law_enforcement+ |
| `/ai/models` | `AIModelManagementPage` | Model registry and lifecycle | admin+ |
| `/tracking` | `EntityTrackingPage` | Active entity tracks list | law_enforcement+ |
| `/tracking/{entityId}` | `EntityTrackDetailPage` | Entity movement path on map | law_enforcement+ |
| `/reconstruction` | `ReconstructionListPage` | 3D reconstruction jobs | law_enforcement+ |
| `/reconstruction/{jobId}` | `ReconstructionViewerPage` | Interactive 3D model viewer | law_enforcement+ |

### 6.2 Key Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `AIConfidenceViewer` | Dashboard with confidence distribution charts | AIDashboardPage |
| `AIAnalysisCard` | Analysis result card with detection thumbnail and score | AIDashboardPage |
| `FaceMatchGallery` | Grid of matched faces with confidence overlay | AIAnalysisDetailPage |
| `PlateMatchCard` | ALPR result with plate image and recognised text | AIAnalysisDetailPage |
| `BehaviourTimeline` | Temporal behaviour anomaly timeline | AIAnalysisDetailPage |
| `ModelRegistryTable` | Versioned model list with status, metrics | AIModelManagementPage |
| `ModelPromoteDialog` | Confirm promotion of model to production | AIModelManagementPage |
| `EntityTrackMap` | Map with entity movement path polyline | EntityTrackDetailPage |
| `TrackSegmentOverlay` | Individual camera segment highlight on map | EntityTrackDetailPage |
| `CameraTransitionGraph` | Graph showing camera-to-camera transitions | EntityTrackDetailPage |
| `ReconstructionJobCard` | Job status card with progress bar | ReconstructionListPage |
| `ReconstructionViewer3D` | Three.js/WebGL-based 3D model viewer | ReconstructionViewerPage |
| `ReconstructionControls` | Orbit, zoom, measure, annotate controls | ReconstructionViewerPage |
| `EdgeNodeTable` | Edge node list with status, last heartbeat | Admin infrastructure page |
| `EdgeNodeDetail` | Single node health, stats, camera info | Admin infrastructure page |

### 6.3 Entity Tracking Map Layout

```
+--------------------------------------------------+
| Entity Track: TRK-2026-00423                     |
| [Persistent ID] [Status: Active]                 |
+--------------------------------------------------+
|                                                    |
|  [Map with movement path polyline]                |
|                                                    |
|  ● Start: CAM-GP-001 (14:30:00)                   |
|  ─▶ CAM-GP-002 (14:31:15)                          |
|  ─▶ CAM-GP-004 (14:32:40)                          |
|  ● Last: CAM-GP-007 (14:35:20)                    |
|                                                    |
+--------------------------------------------------+
| Timeline:                                         |
| 14:30:00 │ Face detected at CAM-GP-001            |
| 14:31:15 │ Re-ID match continued at CAM-GP-002    |
| 14:32:40 │ ALPR: vehicle CA-123-456 detected      |
| 14:35:20 │ Entity entered blind zone              |
+--------------------------------------------------+
```

---

## 7. Mobile Screens (Expo)

### 7.1 Screen Structure

| Screen | Route | Description | Auth |
|--------|-------|-------------|------|
| `AIAnalysisStatusScreen` | `/ai/status` | Real-time analysis job status list | security+ |
| `AIAnalysisDetailScreen` | `/ai/status/{jobId}` | Single analysis result summary | security+ |
| `EntityTrackScreen` | `/tracking` | Active entity tracks (read-only) | law_enforcement+ |

### 7.2 Key Mobile Components

| Component | Description |
|-----------|-------------|
| `AnalysisJobCard` | Job status card (queued/processing/complete/failed) |
| `ConfidenceBadge` | Colour-coded confidence score badge |
| `DetectionPreview` | Small thumbnail of detection with bounding box |
| `TrackListItem` | Entity track summary for list view |

---

## 8. Testing Focus

### 8.1 Unit Tests

| Area | Tests | Coverage |
|------|-------|----------|
| **AI orchestration service** | Queue submission, job status polling, result ingestion, retry logic | 90%+ |
| **Model registry** | Version CRUD, promotion workflow, status transitions | 95%+ |
| **Entity tracking logic** | Track creation, segment chaining, camera transition linking | 90%+ |
| **Movement path synthesis** | Path point ordering, gap filling, trajectory export | 90%+ |
| **Reconstruction job management** | Job submission, progress tracking, model URL generation | 90%+ |
| **Edge node heartbeat** | Status tracking, offline detection, alert triggering | 95%+ |

### 8.2 Integration Tests

| Test | Description |
|------|-------------|
| Media → AI analysis flow | Upload evidence → queue analysis → AI processes → results stored |
| Face match → alert trigger | Match above threshold → alert created → notification sent |
| ALPR match → profile link | Plate detected → match existing profile → case evidence linked |
| Re-ID track continuation | Same person across two camera feeds → single track maintained |
| Reconstruction job lifecycle | Submit → process → complete → model downloadable |
| Edge node heartbeat → offline alert | Node misses 3 heartbeats → alert triggered, status = offline |

### 8.3 AI Service Tests (Python)

| Test | Description |
|------|-------------|
| Face detection model loading | Load YOLOv8 model, verify inference on test image |
| Face recognition accuracy | Known face match returns confidence > 95% |
| ALPR accuracy | Known plate correctly OCR'd with confidence > 90% |
| Behaviour anomaly scoring | Normal activity scores low, anomalous activity scores high |
| Re-ID feature extraction | Same person in different cameras produces similar embeddings |
| Reconstruction pipeline | Multi-view input produces valid point cloud output |

### 8.4 E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| `ai-analysis-status.spec.ts` | Submit media, check analysis status updates |
| `ai-confidence-viewer.spec.ts` | View AI dashboard with confidence charts |
| `entity-tracking-map.spec.ts` | View entity track on map, inspect path |
| `model-management.spec.ts` | Promote model to production, verify version change |
| `reconstruction-viewer.spec.ts` | View 3D reconstruction, orbit controls, annotations |

---

## 9. Estimated Effort Breakdown

| Task | Hours | Assigned To |
|------|-------|-------------|
| **Database — AI & Edge schema** (Prisma models + raw SQL for pgvector) | 12 | Backend Dev |
| **Database — Tracking & Reconstruction schema** | 10 | Backend Dev |
| **AI orchestration service (Node.js)** — Queue, dispatch, result ingestion | 20 | Full Stack Dev |
| **Model registry & lifecycle API** | 12 | Backend Dev |
| **Python AI microservice setup** — FastAPI, Docker, Redis queue consumer | 20 | AI/ML Dev |
| **Face detection + recognition pipeline** (YOLOv8 + ArcFace) | 30 | AI/ML Dev |
| **ALPR pipeline** (YOLOv8 plate detection + OCR) | 20 | AI/ML Dev |
| **Behaviour anomaly detection** (SlowFast/I3D training + inference) | 30 | AI/ML Dev |
| **Re-ID service** (OSNet embedding + FAISS similarity search) | 24 | AI/ML Dev |
| **Entity tracking + movement path synthesis** | 16 | Full Stack Dev |
| **3D reconstruction pipeline** (COLMAP + NeRF integration) | 30 | AI/ML Dev |
| **Edge node management** (registration, heartbeat, config) | 10 | Backend Dev |
| **Web: AI dashboard & confidence viewer** | 16 | Frontend Dev |
| **Web: Entity tracking map** | 14 | Frontend Dev |
| **Web: Model management page** | 10 | Frontend Dev |
| **Web: 3D reconstruction viewer** (Three.js/WebGL) | 24 | Frontend Dev |
| **Mobile: AI analysis status** | 8 | Frontend Dev |
| **Tests** (unit, integration, Python tests, E2E) | 30 | All |
| **Documentation** (API, model cards, deployment guide) | 6 | PM / BA |
| **Total** | **342** | |

---

## 10. Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI model accuracy below 95% threshold | Forensic non-admissibility | Multiple model iterations; human-in-the-loop verification; confidence threshold configurable per use case |
| GPU resource availability (dev environment) | Slow AI inference | Use CPU-optimized models for dev; cloud GPU for staging/prod; mock AI results for frontend dev |
| 3D reconstruction compute cost | Expensive processing | Implement tiered quality presets (draft/standard/high); async processing with progress feedback |
| Python-Node.js integration complexity | Data sync issues | Well-defined internal API contract; JSON schemas for all inter-service messages; comprehensive integration tests |
| pgvector extension not available | Fallback embedding search | Cosine similarity in application layer as fallback; pgvector is preferred |

---

## 11. Definition of Done

- [ ] All AI, tracking, reconstruction, and edge node tables created and migrated
- [ ] Python AI microservice deployed and communicating with Node.js API via Redis queue
- [ ] Face detection + recognition pipeline operational with > 95% accuracy (dev benchmark)
- [ ] ALPR pipeline operational with > 90% accuracy on test dataset
- [ ] Behaviour anomaly detection generating alerts on abnormal activity
- [ ] Re-ID service creating consistent entity tracks across camera feeds
- [ ] Movement path synthesis producing valid GeoJSON trajectories
- [ ] 3D reconstruction pipeline producing downloadable models from multi-view input
- [ ] Model registry with versioning, staging/production promotion, and deprecation
- [ ] Web AI dashboard showing real-time analysis results and confidence metrics
- [ ] Entity tracking map functional with path rendering and camera transitions
- [ ] 3D reconstruction viewer rendering interactive WebGL models
- [ ] Mobile analysis status screen functional
- [ ] Edge node registration, heartbeat, and health monitoring operational
- [ ] Unit + integration test coverage > 80% across all modules
- [ ] E2E tests passing for critical AI workflows
