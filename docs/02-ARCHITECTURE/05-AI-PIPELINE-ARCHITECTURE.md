# Sentinel360 — AI Pipeline Architecture

> **Document:** 05-AI-PIPELINE-ARCHITECTURE.md  
> **Version:** 1.0  
> **Status:** Approved  
> **Last Updated:** June 2026

---

## AI Pipeline Philosophy

1. **Edge-first inference** — Minimize latency for time-critical detections; run lightweight models on edge devices
2. **Cloud consolidation** — Cross-camera re-identification, entity resolution, and 3D reconstruction run in the cloud
3. **Confidence cascading** — Each pipeline stage increases confidence; alerts fire only when cascaded threshold is met
4. **Model versioning** — Every inference is traceable to a specific model version for audit and re-evaluation
5. **Feedback loops** — Human verification results feed back into model retraining and calibration
6. **Forensic-grade traceability** — Every inference decision is logged with full provenance data

---

## AI Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI PIPELINE COMPONENTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    EDGE INFERENCE LAYER                             │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │    │
│  │  │ Frame       │  │ Face        │  │ ALPR        │  │ Behaviour│ │    │
│  │  │ Acquisition │  │ Detection   │  │ Engine      │  │ Detection│ │    │
│  │  │ (5 FPS)     │  │ & Embedding │  │             │  │ Model    │ │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────┬─────┘ │    │
│  │         │                │                │              │       │    │
│  │  ┌──────▼────────────────▼────────────────▼──────────────▼─────┐ │    │
│  │  │                Local Aggregation & Buffering                 │ │    │
│  │  └──────────────────────────────┬───────────────────────────────┘ │    │
│  └─────────────────────────────────┼─────────────────────────────────┘    │
│                                    │ Kafka (SSL)                          │
│  ┌─────────────────────────────────┼─────────────────────────────────┐    │
│  │                    CLOUD INFERENCE LAYER                          │    │
│  │  ┌──────────────────────────────▼───────────────────────────────┐ │    │
│  │  │                    Event Bus (Kafka)                          │ │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │ │    │
│  │  │  │video-    │  │detection-│  │alert-    │  │evidence-    │ │ │    │
│  │  │  │frames    │  │events    │  │events    │  │chain        │ │ │    │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  │                                                                     │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────────┐ │    │
│  │  │ Face Re-ID  │  │ Entity      │  │ 3D Scene Reconstruction    │ │    │
│  │  │ (Metric     │  │ Resolution  │  │ (NeRF / 3D Gaussian        │ │    │
│  │  │  Learning)  │  │ & Merging   │  │  Splatting)                │ │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────────┬─────────────┘ │    │
│  │         │                │                         │              │    │
│  │  ┌──────▼────────────────▼─────────────────────────▼──────────┐  │    │
│  │  │              Confidence Scorer & Calibrator                  │  │    │
│  │  └──────────────────────────────┬───────────────────────────────┘  │    │
│  │                                 │                                  │    │
│  │  ┌──────────────────────────────▼───────────────────────────────┐  │    │
│  │  │              Alert Dispatcher / Case Evidence Creator          │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    MODEL MANAGEMENT LAYER                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │    │
│  │  │ MLflow      │  │ A/B Testing │  │ Feedback    │               │    │
│  │  │ Registry    │  │ Framework   │  │ Pipeline    │               │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline 1: Facial Recognition Pipeline

### Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Camera   │──►│ Frame    │──►│ Face     │──►│ Face     │──►│ Compare  │
│ Feed     │   │ Grabber  │   │ Detection│   │ Embedding│   │ to DB    │
│ (RTSP)   │   │ (5 FPS)  │   │(MTCNN/   │   │(ArcFace  │   │ (Cosine  │
│          │   │          │   │ Retina)  │   │ ResNet)  │   │ Similar) │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘
                                                                   │
                                                    ┌──────────────▼──────┐
                                                    │ Confidence Scorer   │
                                                    │ (Cascade)           │
                                                    │                     │
                                                    │  1. Detection conf  │
                                                    │  2. Embedding sim   │
                                                    │  3. Temporal consis │
                                                    │  4. Geo proximity   │
                                                    │  5. Time decay      │
                                                    └──────────┬──────────┘
                                                               │
                                          ┌────────────────────▼──────────┐
                                          │ Score > Threshold?             │
                                          │  YES → Generate Alert          │
                                          │  NO → Store for future match   │
                                          └────────────────────────────────┘
```

### Edge Component: Face Detection & Embedding

| Parameter | Value |
|-----------|-------|
| **Detection Model** | RetinaFace (ResNet-50 backbone) |
| **Embedding Model** | ArcFace (ResNet-100 backbone, 512-dim) |
| **Input Resolution** | 112×112 (after face crop + alignment) |
| **Min Face Size** | 80×80 pixels |
| **Max Detections per Frame** | 50 |
| **Latency (Jetson Orin)** | ~25ms per face (detection + embedding) |
| **FPS Processed** | 5 FPS (configurable) |

### Cloud Component: Face Re-ID

| Parameter | Value |
|-----------|-------|
| **Similarity Metric** | Cosine similarity |
| **Gallery Storage** | pgvector (IVFFlat index) |
| **Top-K Retrieval** | Top 10 matches |
| **Confidence Threshold** | ≥ 0.70 (70%) for candidate list; ≥ 0.92 (92%) for automatic alert |
| **Temporal Consistency** | Same face tracked across ≥ 3 consecutive frames before alert |
| **Model** | ArcFace + re-ranking with CosFace similarity |

### Confidence Scoring Formula

```
C_total = w₁ × C_detection + w₂ × C_similarity + w₃ × C_temporal + w₄ × C_geo + w₅ × C_time

Where:
  C_detection   = Face detection confidence (0-1)
  C_similarity  = Max cosine similarity to known profiles (0-1)
  C_temporal    = Temporal consistency score (tracked across frames)
  C_geo         = Geographic proximity score (how close to last known location)
  C_time        = Time decay factor (recent sightings weighted higher)
  
  w₁ = 0.15, w₂ = 0.45, w₃ = 0.20, w₄ = 0.10, w₅ = 0.10

Alert Thresholds:
  C_total ≥ 0.95  → Immediate alert (Critical)
  C_total ≥ 0.90  → High priority alert
  C_total ≥ 0.80  → Standard alert
  C_total ≥ 0.70  → Flag for review (no automatic alert)
  C_total < 0.70  → Silent (store for future cross-referencing)
```

---

## Pipeline 2: Behaviour Detection Pipeline

### Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Camera   │──►│ Frame    │──►│ Skeletal │──►│ Behaviour│──►│ Anomaly  │
│ Feed     │   │ Grabber  │   │ Tracking │   │ CNN      │   │ Scorer   │
│ (360°)   │   │ (10 FPS) │   │ (Pose)   │   │ (3D CNN) │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘
                                                                   │
                                          ┌────────────────────────▼─────┐
                                          │ Anomaly Score > Threshold?   │
                                          │  YES → Behaviour Alert      │
                                          │  + Evidence Capture         │
                                          │  NO → Continue monitoring   │
                                          └──────────────────────────────┘
```

### Behaviour Classes Detected

| Class | Description | Alert Severity |
|-------|-------------|----------------|
| `loitering` | Person remaining in area beyond threshold | low |
| `trespassing` | Person in restricted/off-limits area | medium |
| `fighting` | Physical altercation detected | critical |
| `vandalism` | Property damage in progress | high |
| `suspicious_object` | Object left unattended | medium |
| `crowd_dispersal` | Group scattering rapidly | high |
| `unauthorized_vehicle` | Vehicle in pedestrian-only zone | medium |
| `theft_in_progress` | Taking property without consent | critical |
| `running` | Person running in sensitive area | low |
| `weapon_detected` | Visual weapon identification | critical |

### Edge Component: Behaviour Detection

| Parameter | Value |
|-----------|-------|
| **Detection Model** | YOLOv8 (for person/vehicle detection) + 3D CNN (for behaviour classification) |
| **Pose Estimation** | MediaPipe BlazePose / ViTPose (lightweight) |
| **Temporal Window** | 16 frames (~1.6 seconds at 10 FPS) |
| **Input Resolution** | 640×640 (equirectangular projection from 360°) |
| **Latency (Jetson Orin)** | ~50ms per window |
| **Baseline Learning** | Scene-specific baseline built over 7 days; deviations trigger scoring |

---

## Pipeline 3: ALPR (Automatic License Plate Recognition) Pipeline

### Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Camera   │──►│ Frame    │──►│ Vehicle  │──►│ Plate    │──►│ OCR      │
│ Feed     │   │ Grabber  │   │ Detection│   │ Detection│   │ (CRNN)   │
│          │   │          │   │(YOLOv8)  │   │(YOLOv8)  │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘
                                                                   │
                                          ┌────────────────────────▼─────┐
                                          │ Plate Text Validation        │
                                          │ (Regex + checksum)           │
                                          └──────────────┬──────────────┘
                                                         │
                                          ┌──────────────▼──────────────┐
                                          │ Cross-reference:            │
                                          │  - Wanted vehicles          │
                                          │  - Known associates         │
                                          │  - Stolen vehicle DB        │
                                          └──────────────┬──────────────┘
                                                         │
                                          ┌──────────────▼──────────────┐
                                          │ Match? → Generate Alert    │
                                          │ No match → Store for future│
                                          └─────────────────────────────┘
```

### ALPR Specifications

| Parameter | Value |
|-----------|-------|
| **Vehicle Detection** | YOLOv8m (medium) — 80+ vehicle types |
| **Plate Detection** | YOLOv8n (nano) — lightweight, fast |
| **OCR Backbone** | CRNN (CNN + Bidirectional LSTM + CTC loss) |
| **Supported Plates** | South African (standard + custom), international formats |
| **Latency (Jetson Orin)** | ~35ms per vehicle |
| **Accuracy** | >97% on standard SA plates (day), >92% (night) |
| **Min Plate Height** | 20 pixels |
| **Output** | `{plate_text, plate_region, vehicle_make, vehicle_model, vehicle_color, confidence}` |

### Vehicle Attribute Extraction

In addition to plate text, the ALPR pipeline extracts:

| Attribute | Method | Confidence Target |
|-----------|--------|-------------------|
| Vehicle Make | Vehicle classification model (ResNet-50) | >90% |
| Vehicle Model | Fine-grained classification | >85% |
| Vehicle Color | Color classifier (HSV histogram + CNN) | >95% |
| Vehicle Year | Multi-class year classifier | >75% |
| Vehicle Type | Sedan, SUV, truck, motorcycle, etc. | >95% |

---

## Pipeline 4: 3D Scene Reconstruction Pipeline

### Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ 360°     │──►│ Frame    │──►│ Feature  │──►│ Depth    │──►│ 3D Model │
│ Camera   │   │ Selection│   │ Matching │   │ Estimation│   │ Synthesis│
│ (Multi-  │   │ (Key     │   │ (SfM)    │   │ (MVS)    │   │ (NeRF /  │
│  View)   │   │  Frames) │   │          │   │          │   │ 3DGS)    │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘
                                                                   │
                                          ┌────────────────────────▼─────┐
                                          │ Post-processing:             │
                                          │  - Mesh simplification       │
                                          │  - Texture mapping           │
                                          │  - Dimension calibration     │
                                          │  - Annotation overlay        │
                                          └──────────────┬──────────────┘
                                                         │
                                          ┌──────────────▼──────────────┐
                                          │ Export formats:             │
                                          │  - glTF / GLB (web)        │
                                          │  - OBJ + MTL (forensic)    │
                                          │  - PLY (point cloud)       │
                                          │  - WebGL viewer embed      │
                                          └─────────────────────────────┘
```

### Reconstruction Specifications

| Parameter | Value |
|-----------|-------|
| **Input** | 5-30 seconds of 360° video (minimum 2 camera angles) |
| **Frame Rate** | 2 FPS for reconstruction (from 360° equirectangular) |
| **Method** | NeRF (Neural Radiance Fields) for quality; 3D Gaussian Splatting for speed |
| **Output Format** | glTF/GLB for web viewer; PLY for point cloud; OBJ for forensic tools |
| **Processing Time** | 5-15 minutes (GPU pod, single A100) |
| **Accuracy** | <2cm error at 5m distance |
| **Texture Resolution** | 4K texture maps |
| **Viewer** | Three.js / React Three Fiber with orbit controls, measurement tools, annotation layers |

### Integration Points

| Feature | Description |
|---------|-------------|
| **Evidence Overlay** | Drag evidence markers onto 3D scene (e.g., "shell casing found here") |
| **Path Tracing** | Overlay suspect/vehicle movement paths as 3D splines |
| **Measurement Tool** | Distance, area, and height measurements in 3D space |
| **Timeline Slider** | Scrub through temporal reconstruction (before/during/after incident) |
| **Camera Position** | Show camera positions in 3D space with frustum visualization |

---

## Pipeline 5: Entity Re-identification (Re-ID)

### Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Camera A │──►│ Person   │──►│ Feature  │──►│ Camera B │──►│ Feature  │
│ Detection│   │ Crop     │   │ Extractor│   │ Detection│   │ Extractor│
└──────────┘   └──────────┘   └────┬─────┘   └──────────┘   └────┬─────┘
                                   │                              │
                                   └──────────┬──────────────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │ Feature Similarity   │
                                   │ (Cosine / Euclidean) │
                                   └──────────┬──────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │ Match Score > 0.75? │
                                   │  YES → Same Entity  │
                                   │  NO → New Entity    │
                                   └──────────┬──────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │ Movement Path Update │
                                   │ (GPS trace across    │
                                   │  camera nodes)       │
                                   └─────────────────────┘
```

### Re-ID Specifications

| Parameter | Value |
|-----------|-------|
| **Feature Extractor** | ResNet-50 + PCB (Part-based Convolution Baseline) |
| **Embedding Dimension** | 2048 |
| **Gallery Update** | Real-time (new detections added to temporary gallery) |
| **Gallery Retention** | 7 days for short-term Re-ID; persistent for known persons |
| **Matching Threshold** | 0.75 (cosine similarity) for same-person hypothesis |
| **Temporal Constraint** | Candidates must be temporally consistent (track moves forward in time) |
| **Spatial Constraint** | Candidates must be within plausible travel distance between camera nodes |

---

## Model Versioning & Registry

### MLflow Integration

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MLflow Tracking Server                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Experiments                                                     │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │ │
│  │  │ face_reid_v2 │ │ alpr_v3     │ │ behaviour_   │               │ │
│  │  │              │ │             │ │ detection_v4│               │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘               │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Model Registry (Staging → Production → Deprecated)              │ │
│  │                                                                   │ │
│  │  face_reid:                                                      │ │
│  │    ├── v1.0.0 (deprecated) accuracy: 0.921                       │ │
│  │    ├── v1.1.0 (staging)    accuracy: 0.934  ← A/B test candidate│ │
│  │    └── v1.0.3 (production) accuracy: 0.928                       │ │
│  │                                                                   │ │
│  │  alpr:                                                           │ │
│  │    ├── v2.0.0 (production)  accuracy: 0.971                      │ │
│  │    └── v2.1.0 (staging)     accuracy: 0.978  ← A/B test candidate│ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Model Lifecycle

```
1. TRAIN        → Develop model, log metrics, store artifact (MLflow)
       │
2. EVALUATE     → Run against held-out test set; minimum thresholds:
                  - Face Re-ID: accuracy ≥ 0.90, precision ≥ 0.92
                  - ALPR: accuracy ≥ 0.95, precision ≥ 0.95
                  - Behaviour detection: F1 ≥ 0.85
                  - 3D Reconstruction: PSNR ≥ 30dB
       │
3. STAGING      → Deploy to staging environment; shadow traffic from production
       │
4. A/B TEST     → Route 5% of production traffic to staging model
       │          Compare: accuracy, latency, false positive rate
       │
5. PROMOTE      → If staging outperforms production for 7 days:
                  - Promote to production
                  - Deprecate previous production model
                  - Log decision in MLflow
       │
6. MONITOR      → Continuous monitoring in production:
                  - Accuracy drift detection (weekly evaluation)
                  - Latency degradation alert
                  - Data distribution shift (Evidently AI)
       │
7. RETIRE       → Deprecated models kept for 90 days for rollback
                  - After 90 days: archived to S3 Glacier
```

### Inference Traceability

Every inference result stores:

```json
{
  "id": "uuid",
  "modelVersion": {
    "id": "uuid",
    "name": "face_recognition",
    "version": "1.0.3",
    "s3Key": "models/face/v1.0.3/model.pt"
  },
  "input": {
    "evidenceId": "uuid",
    "frameTimestamp": "2026-06-04T15:00:00.000Z",
    "cameraId": "CAM-GP-001"
  },
  "output": {
    "detectionClass": "face",
    "detectionConfidence": 0.987,
    "embeddingVector": "[512 floats]",
    "matchedProfileId": "uuid",
    "matchConfidence": 0.945
  },
  "performance": {
    "inferenceLatencyMs": 28.5,
    "gpuUtilization": 0.65,
    "memoryUsageMb": 1240
  }
}
```

---

## Feedback Loop Architecture

### Human-in-the-Loop Verification

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ AI Detection│────►│ Confidence  │────►│ Alert       │────►│ Human       │
│             │     │ Scorer      │     │ Dispatcher  │     │ Verification│
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                                          ┌─────────────────────────▼────┐
                                          │ Verification Decision:       │
                                          │  APPROVED → Evidence + Case │
                                          │  REJECTED → Feedback to AI  │
                                          │  UNCERTAIN → Queue for QA    │
                                          └─────────┬───────────────────┘
                                                      │
                                          ┌───────────▼───────────────┐
                                          │ Feedback Record:          │
                                          │  - Inference ID           │
                                          │  - Human Decision         │
                                          │  - Confidence Score       │
                                          │  - Officer ID             │
                                          │  - Timestamp              │
                                          │  - Notes                  │
                                          └───────────┬───────────────┘
                                                        │
                                          ┌─────────────▼─────────────┐
                                          │ Weekly Model Evaluation:  │
                                          │  - Compare AI vs human    │
                                          │  - Calibration adjustment │
                                          │  - Retraining trigger     │
                                          └───────────────────────────┘
```

### Confidence Calibration

The confidence scorer is re-calibrated weekly against human verification data:

```
Calibration Process:
1. Collect all verification decisions from the past 7 days
2. For each bucket of AI confidence scores (0-0.1, 0.1-0.2, ..., 0.9-1.0):
   a. Calculate empirical accuracy = approved / (approved + rejected)
   b. Compare to AI confidence midpoint
   c. If calibration drift > 5% → adjust temperature scaling parameter
3. Log calibration adjustment with version number
4. Apply new calibration to confidence scoring service
```

### Active Learning Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Low-confidence matches | Score 0.60-0.75, later verified correct | Add to hard negative mining set |
| False positives | High confidence (>0.90) but rejected | Automatic review; add to training set |
| Novel scenarios | Detection class not in training data | Flag for model retraining |
| Data drift | Input distribution shift > 2 std dev | Retrain trigger; alert ML team |
| Period retraining | >10,000 new verified samples | Scheduled retraining pipeline |

---

## Edge Device Resource Allocation

### NVIDIA Jetson Orin — Model Distribution

| Model | GPU Memory | Inference/Frame | Priority |
|-------|-----------|-----------------|----------|
| YOLOv8 (detection) | 1.2 GB | 15ms | Critical |
| ArcFace (embedding) | 800 MB | 25ms | High |
| ALPR (YOLOv8 + CRNN) | 1.0 GB | 35ms | High |
| Pose Estimation | 500 MB | 20ms | Medium |
| 3D CNN (behaviour) | 1.5 GB | 50ms | Medium |
| **Total** | **5.0 GB** | **~145ms** | |

### Edge Pipeline Optimization

```
Frame Pipeline (parallel where possible):
┌─────────────────────────────────────────────────────────┐
│ Frame 1:  ├────┤ Detection (YOLOv8)  ├────┤            │
│           │ 15ms│                     │ 15ms│            │
│ Frame 1:  │    ├── Face Emb (ArcFace)├────┤            │
│           │    │ 25ms                │    │            │
│ Frame 1:  │    ├── ALPR (YOLOv8+OCR) ├────┤            │
│           │    │ 35ms                │    │            │
│ Frame 1:  │    ├── Pose (MediaPipe)  ├────┤            │
│           │    │ 20ms                │    │            │
│ Frame N:  ├────┤ Behaviour (3D CNN)  ├────┤            │
│ (window   │ 50ms│ (every 16 frames)  │ 50ms│            │
│  of 16)   ├────┤                     ├────┤            │
└─────────────────────────────────────────────────────────┘
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Face detection latency (edge) | <30ms per frame | p99 over 1 hour window |
| Face Re-ID query latency (cloud) | <200ms | p95 over 1 hour window |
| ALPR detection latency (edge) | <40ms per vehicle | p99 over 1 hour window |
| Behaviour detection latency (edge) | <60ms per window | p99 over 1 hour window |
| 3D reconstruction time | <15 minutes per scene | Average over 10 reconstructions |
| Face recognition accuracy | ≥95% TAR @ 0.1% FAR | On Sentinel360 validation set |
| ALPR accuracy | ≥97% (day), ≥92% (night) | On Sentinel360 validation set |
| Behaviour detection F1 | ≥0.85 | On Sentinel360 validation set |
| False positive rate (alerts) | <1 per 1000 hours of footage | Aggregated across all deployments |
| Model update deployment | <5 minutes rolling update | Zero-downtime deployment |

---

## Data Retention & Privacy

| Data Type | Edge Retention | Cloud Retention | Rationale |
|-----------|---------------|-----------------|-----------|
| Raw video frames | 7 days | 90 days (raw), 365 days (evidence) | Immediate investigation + evidence preservation |
| Face embeddings | 7 days | Match profile lifetime | Re-identification capability |
| ALPR records | 7 days | 365 days | Vehicle tracking |
| Behaviour detections | 7 days | 90 days | Incident reconstruction |
| 3D reconstructions | Not stored | 365 days | Case resolution timeline |
| Inference logs | 30 days | 365 days (audit requirement) |
| Model artifacts | Current only | Permanent (versioned) | Reproducibility and audit |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Software Architect | Initial AI pipeline architecture |
