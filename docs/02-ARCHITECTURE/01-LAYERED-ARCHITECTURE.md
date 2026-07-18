# Sentinel360 — Layered Architecture

> **Document:** 01-LAYERED-ARCHITECTURE.md  
> **Version:** 1.0  
> **Status:** Approved  
> **Last Updated:** June 2026

---

## Architecture Philosophy

Sentinel360 follows a **layered architecture** pattern organized along domain boundaries. Each layer has a well-defined responsibility and communicates with adjacent layers through explicit interfaces. This design ensures:

- **Separation of concerns** — Each layer focuses on its core competency
- **Testability** — Layers can be tested in isolation with mocked dependencies
- **Replacability** — Implementation details can change without affecting other layers
- **Security** — Each layer enforces its own security boundaries

---

## Layer Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: USERS LAYER                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────────────┐ │
│  │ Community│  │ Security │  │  Law Enf │  │ Admin  │  │  Super Admin   │ │
│  │ Members  │  │ Operators│  │ Officers │  │        │  │                │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  └────────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS/WSS (TLS 1.3)
┌───────────────────────────────────▼─────────────────────────────────────────┐
│  LAYER 2: APPLICATION LAYER                                                  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                    API GATEWAY (Kong)                            │       │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │       │
│  │  │ Auth │ │Rate  │ │Route │ │Log   │ │Cache │ │CORS  │       │       │
│  │  │Plugin│ │Limit │ │      │ │      │ │      │ │      │       │       │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌──────────────────────────────────────┐ ┌──────────────────────────────┐  │
│  │        WEB CLIENT (React/TS)         │ │      MOBILE APP (RN)         │  │
│  │  ┌────────┐ ┌──────┐ ┌───────────┐  │ │  ┌────────┐ ┌─────────────┐ │  │
│  │  │Public  │ │Docket│ │Investigator│  │ │ │Sighting│ │ Alert       │ │  │
│  │  │Feed    │ │Page  │ │Dashboard  │  │ │ │Submit  │ │ Receiver    │ │  │
│  │  └────────┘ └──────┘ └───────────┘  │ │ └────────┘ └─────────────┘ │  │
│  └──────────────────────────────────────┘ └──────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                    BACKEND SERVICES (Node.js/NestJS)              │       │
│  │                                                                   │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │       │
│  │  │ Auth     │ │ User     │ │ Case     │ │ Evidence         │   │       │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service          │   │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │       │
│  │  │ Alert    │ │ Sighting │ │Analytics │ │ AI Orchestrator  │   │       │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service          │   │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │       │
│  │  ┌──────────┐ ┌────────────────────────────────────────┐       │       │
│  │  │ Audit    │ │    Background Job Workers (Bull/BullMQ) │       │       │
│  │  │ Service  │ │    ┌────────┐┌────────┐┌────────────┐ │       │       │
│  │  └──────────┘ │    │Video   ││Report  ││Confidence  │ │       │       │
│  │               │    │Process ││Generate││Scorer      │ │       │       │
│  │               │    └────────┘└────────┘└────────────┘ │       │       │
│  │               └────────────────────────────────────────┘       │       │
│  └──────────────────────────────────────────────────────────────────┘       │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ Internal API / gRPC / Events
┌───────────────────────────────────▼─────────────────────────────────────────┐
│  LAYER 3: AI PROCESSING LAYER                                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │                EDGE INFERENCE NODES (NVIDIA Jetson)       │               │
│  │                                                          │               │
│  │  ┌──────────────────┐  ┌──────────────────┐             │               │
│  │  │ Behaviour        │  │ Face Detection   │             │               │
│  │  │ Detection Model  │  │ & Embedding      │             │               │
│  │  │ (YOLOv8 + 3D CNN)│  │ (ArcFace/InsightFace)          │               │
│  │  └──────────────────┘  └──────────────────┘             │               │
│  │  ┌──────────────────┐  ┌──────────────────┐             │               │
│  │  │ ALPR Engine      │  │ Motion Tracking   │             │               │
│  │  │ (YOLOv8 + OCR)   │  │ (DeepSORT)        │             │               │
│  │  └──────────────────┘  └──────────────────┘             │               │
│  └──────────────────────────────────────────────────────────┘               │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │                CLOUD AI SERVICES                          │               │
│  │                                                          │               │
│  │  ┌──────────────────┐  ┌──────────────────┐             │               │
│  │  │ Face Re-ID       │  │ 3D Scene         │             │               │
│  │  │ Network          │  │ Reconstruction   │             │               │
│  │  │ (Metric Learning)│  │ (NeRF/3D Gaussian)             │               │
│  │  └──────────────────┘  └──────────────────┘             │               │
│  │  ┌──────────────────┐  ┌──────────────────┐             │               │
│  │  │ Entity Resolution│  │ Confidence        │             │               │
│  │  │ & Merging        │  │ Scorer + Calibrator            │               │
│  │  └──────────────────┘  └──────────────────┘             │               │
│  │  ┌──────────────────────────────────────────┐           │               │
│  │  │ Model Registry & Version Control (MLflow) │           │               │
│  │  └──────────────────────────────────────────┘           │               │
│  └──────────────────────────────────────────────────────────┘               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│  LAYER 4: DATA LAYER                                                         │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐                         │
│  │  PostgreSQL (Primary) │  │  Redis               │                         │
│  │  ┌────────────────┐  │  │  ┌────────────────┐  │                         │
│  │  │ Users & Roles  │  │  │  │ Session Cache  │  │                         │
│  │  ├────────────────┤  │  │  ├────────────────┤  │                         │
│  │  │ Criminal       │  │  │  │ Rate Limit     │  │                         │
│  │  │ Profiles       │  │  │  │ Counters       │  │                         │
│  │  ├────────────────┤  │  │  ├────────────────┤  │                         │
│  │  │ Cases/Dockets  │  │  │  │ Realtime Feed  │  │                         │
│  │  ├────────────────┤  │  │  │ Pub/Sub        │  │                         │
│  │  │ Evidence Chain │  │  │  └────────────────┘  │                         │
│  │  ├────────────────┤  │  └──────────────────────┘                         │
│  │  │ Sightings      │  │                                                   │
│  │  ├────────────────┤  │  ┌──────────────────────┐                         │
│  │  │ Alert Queue    │  │  │  Apache Kafka         │                         │
│  │  ├────────────────┤  │  │  ┌────────────────┐  │                         │
│  │  │ Audit Logs     │  │  │  │ Video Frame    │  │                         │
│  │  ├────────────────┤  │  │  │ Events Topic   │  │                         │
│  │  │ AI Model       │  │  │  ├────────────────┤  │                         │
│  │  │ Versions       │  │  │  │ Alert Events   │  │                         │
│  │  └────────────────┘  │  │  ├────────────────┤  │                         │
│  └──────────────────────┘  │  │ Evidence Chain │  │                         │
│                            │  │ Events Topic   │  │                         │
│  ┌──────────────────────┐  │  ├────────────────┤  │                         │
│  │  S3-Compatible        │  │  │ AI Inference   │  │                         │
│  │  Object Store         │  │  │ Results        │  │                         │
│  │  ┌────────────────┐  │  │  └────────────────┘  │                         │
│  │  │ Raw Video      │  │  └──────────────────────┘                         │
│  │  ├────────────────┤  │                                                   │
│  │  │ Snapshots      │  │  ┌──────────────────────┐                         │
│  │  ├────────────────┤  │  │  Elasticsearch        │                         │
│  │  │ 3D Models      │  │  │  (Full-text search    │                         │
│  │  ├────────────────┤  │  │   across cases,       │                         │
│  │  │ Exported       │  │  │   evidence, profiles) │                         │
│  │  │ Reports        │  │  └──────────────────────┘                         │
│  │  └────────────────┘  │                                                   │
│  └──────────────────────┘                                                   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ RTSP / HTTP-FLV
┌───────────────────────────────────▼─────────────────────────────────────────┐
│  LAYER 5: INFRASTRUCTURE LAYER                                               │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │              PHYSICAL / EDGE INFRASTRUCTURE                │               │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │               │
│  │  │ 360° Camera  │  │ 360° Camera │  │ 360° Camera │      │               │
│  │  │ Node 1       │  │ Node 2      │  │ Node N      │      │               │
│  │  │ (Insta360    │  │             │  │             │      │               │
│  │  │  Pro 2)      │  │             │  │             │      │               │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │               │
│  │         │                 │                 │              │               │
│  │  ┌──────▼─────────────────▼─────────────────▼───────┐      │               │
│  │  │            Edge Compute (NVIDIA Jetson Orin)      │      │               │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │      │               │
│  │  │  │Frame     │ │AI        │ │Local     │        │      │               │
│  │  │  │Grabber   │ │Inference │ │Buffer    │        │      │               │
│  │  │  └──────────┘ └──────────┘ └──────────┘        │      │               │
│  │  └─────────────────────────────────────────────────┘      │               │
│  └──────────────────────────────────────────────────────────┘               │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │              CLOUD INFRASTRUCTURE (AWS/GCP)                │               │
│  │                                                          │               │
│  │  ┌──────────────────────┐  ┌──────────────────────┐     │               │
│  │  │ Kubernetes (EKS/GKE)  │  │ PostgreSQL RDS        │     │               │
│  │  │ ┌────┐ ┌────┐ ┌────┐ │  │ (Multi-AZ, Read       │     │               │
│  │  │ │API │ │Job │ │AI  │ │  │  Replicas x2)         │     │               │
│  │  │ │Pod │ │Pod │ │Pod │ │  └──────────────────────┘     │               │
│  │  │ └────┘ └────┘ └────┘ │  ┌──────────────────────┐     │               │
│  │  └──────────────────────┘  │ Managed Kafka (MSK)    │     │               │
│  │  ┌──────────────────────┐  └──────────────────────┘     │               │
│  │  │ CDN (CloudFront)      │  ┌──────────────────────┐     │               │
│  │  │ → Media delivery      │  │ ElastiCache (Redis)   │     │               │
│  │  └──────────────────────┘  └──────────────────────┘     │               │
│  │  ┌──────────────────────┐  ┌──────────────────────┐     │               │
│  │  │ S3 Buckets            │  │ Elasticsearch         │     │               │
│  │  │ (Video, images,       │  │ Service (AOS)         │     │               │
│  │  │  3D models, reports)  │  └──────────────────────┘     │               │
│  │  └──────────────────────┘                                │               │
│  └──────────────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Users Layer

### User Roles & Responsibilities

| Role | System Access | Key Actions |
|------|--------------|-------------|
| **Community Member** | SentinelWatch (public + authenticated) | View wanted feed, submit sightings, receive alerts |
| **Security Operator** | Full web dashboard + mobile | Monitor feeds, submit CCTV snapshots, receive operational alerts, acknowledge alerts |
| **Law Enforcement Officer** | Full investigation dashboard | Verify snapshots, verify sightings, update criminal status, access case files |
| **Administrator** | Admin panel | Manage criminal profiles, send targeted alerts, verify snapshots (QA), user management (limited) |
| **Super Administrator** | Full system access | Manage users & roles, view audit logs, permanent profile deletion (with 2FA), system configuration |

### Authentication & Access

| Mechanism | Implementation |
|-----------|---------------|
| **Primary Auth** | JWT (access token: 15min TTL, refresh token: 7-day TTL) |
| **Multi-factor** | TOTP-based 2FA for Super Admin (required for destructive actions) |
| **OAuth 2.0 / SSO** | Optional for Law Enforcement (integration with national police systems) |
| **Session Management** | Redis-backed session store; token blacklist for immediate revocation |

---

## Layer 2: Application Layer

### 2.1 API Gateway (Kong)

The API Gateway acts as the single entry point for all client requests.

| Plugin | Purpose |
|--------|---------|
| **Authentication** | JWT validation, token introspection |
| **Rate Limiting** | Tier-based: Community=100 req/min, Security=300, LE=500, Admin=1000, SuperAdmin=2000 |
| **Request/Response Transformation** | Header injection, response compression |
| **CORS** | Whitelisted origins for web and mobile clients |
| **Logging** | Structured JSON logging to stdout + audit service |
| **Caching** | Response caching for public feed (30s TTL) |

### 2.2 Frontend Clients

#### Web Client (React 18 + TypeScript)
- **Build Tool:** Vite
- **UI Framework:** Tailwind CSS + shadcn/ui components
- **State Management:** Zustand (lightweight, TypeScript-first)
- **Data Fetching:** TanStack Query (React Query) for server state
- **WebSocket:** Socket.io-client for real-time alerts
- **3D Rendering:** Three.js / React Three Fiber for crime scene visualization
- **Map Integration:** Mapbox GL or Leaflet for geo-spatial views

#### Mobile App (React Native)
- **Primary Use:** Community sightings submission, alert receiving, wanted feed browsing
- **Camera Integration:** react-native-camera for photo/video capture
- **Push Notifications:** Firebase Cloud Messaging (FCM) / APNs
- **Offline Support:** AsyncStorage for cached wanted feed

### 2.3 Backend Services (NestJS + Node.js)

Each service is a **NestJS module** within the modular monolith, with clear port/adapter boundaries.

| Service | Primary Responsibility | Key Modules |
|---------|----------------------|-------------|
| **Auth Service** | Registration, login, token management, 2FA | JWTModule, TOTPModule, OAuthModule |
| **User Service** | CRUD users, role assignment, profile management | UserModule, RoleModule, PermissionModule |
| **Case Service** | CRUD cases/dockets, timeline management, status workflow | CaseModule, TimelineModule, StatusModule |
| **Evidence Service** | Evidence ingestion, chain of custody, cryptographic hashing | EvidenceModule, ChainOfCustodyModule, HashModule |
| **Sighting Service** | Community sighting submissions, verification workflow | SightingModule, VerificationModule |
| **Alert Service** | Alert creation, targeting, delivery tracking | AlertModule, NotificationModule, DeliveryModule |
| **Analytics Service** | Dashboards, reporting, trend analysis | DashboardModule, ReportModule, ExportModule |
| **AI Orchestrator Service** | Coordinates AI pipeline jobs, receives inference results, manages confidence scoring | PipelineModule, InferenceModule, ScoringModule |
| **Audit Service** | Immutable audit logging, search, export | AuditModule, SearchModule, ExportModule |

### 2.4 Background Job Workers (Bull/BullMQ)

| Worker | Queue | Processing |
|--------|-------|------------|
| **VideoProcessor** | `video-processing` | Transcodes uploaded video, extracts keyframes, triggers AI analysis |
| **ReportGenerator** | `report-generation` | Generates structured PDF/JSON incident reports |
| **ConfidenceScorer** | `confidence-scoring` | Re-evaluates confidence scores as new data arrives |
| **AlertDispatcher** | `alert-dispatch` | Sends push/in-app/email alerts based on delivery rules |
| **EvidenceHasher** | `evidence-hash` | Computes SHA-256 hashes for evidence integrity |
| **ModelEvaluator** | `model-evaluation` | Runs periodic evaluation of deployed models against held-out test sets |

---

## Layer 3: AI Processing Layer

### 3.1 Edge Inference Nodes

Deployed on **NVIDIA Jetson Orin** devices co-located with 360° cameras.

| Component | Model / Approach | Output |
|-----------|-----------------|--------|
| **Frame Grabber** | FFmpeg + NVIDIA NVDEC | 1080p frames at 5 FPS (configurable) |
| **Behaviour Detection** | YOLOv8 + 3D CNN (custom) | Bounding boxes + anomaly scores |
| **Face Detection & Embedding** | ArcFace (ResNet-100 backbone) | 512-dim embedding vectors |
| **ALPR Engine** | YOLOv8 (plate detection) + CRNN OCR | Plate text, vehicle make/model/color |
| **Motion Tracking** | DeepSORT with appearance + motion cues | Tracklet IDs across frames |

### 3.2 Cloud AI Services

| Service | Description | Infrastructure |
|---------|-------------|---------------|
| **Face Re-ID Network** | Cross-camera person matching via metric learning (cosine similarity on embeddings) | GPU pod on Kubernetes |
| **Entity Resolution** | Merges duplicate detections into unified person/vehicle profiles | CPU-based service |
| **3D Scene Reconstruction** | NeRF or 3D Gaussian Splatting from multi-view 360° footage | GPU-intensive batch job |
| **Confidence Scorer** | Cascaded scoring: detection confidence × face match × temporal consistency × geo-proximity | Redis + scoring service |
| **Model Registry (MLflow)** | Versioning, lineage, staging/production promotion | MLflow tracking server |

---

## Layer 4: Data Layer

### 4.1 Primary Database: PostgreSQL (RDS)

| Configuration | Value |
|--------------|-------|
| **Engine** | PostgreSQL 16 |
| **Instance** | db.r6g.xlarge (primary) + 2 × db.r6g.large (read replicas) |
| **Storage** | 500 GB gp3 (auto-scaling enabled) |
| **Backup** | Automated daily snapshots (30-day retention), WAL streaming to S3 |
| **Extensions** | `pgcrypto` (hashing), `postgis` (geo queries), `pg_stat_statements` |

### 4.2 Cache Layer: Redis (ElastiCache)

| Cluster | Purpose | Configuration |
|---------|---------|--------------|
| **Session Cache** | User sessions, token blacklist | 2 × cache.r6g.large, cluster mode disabled |
| **Rate Limit** | API rate limit counters | Same cluster as session |
| **Pub/Sub** | Real-time feed updates, WebSocket bridge | Same cluster |
| **Job Queue** | BullMQ job queues | 2 × cache.r6g.xlarge, cluster mode enabled |

### 4.3 Event Bus: Apache Kafka (MSK)

| Topic | Partitions | Retention | Messages |
|-------|-----------|-----------|----------|
| `video-frames` | 12 | 24 hours | Raw frame metadata + embeddings |
| `detection-events` | 6 | 7 days | AI detection results |
| `alert-events` | 3 | 30 days | Alert lifecycle events |
| `evidence-chain` | 6 | 90 days | Evidence hash chain entries |
| `audit-events` | 3 | 365 days | Immutable audit log entries |
| `model-inference-results` | 6 | 14 days | Raw inference outputs |

### 4.4 Object Storage: S3-Compatible

| Bucket | Purpose | Access Pattern | Retention |
|--------|---------|---------------|-----------|
| `sentinel360-raw-video` | Raw camera recordings | Write-once, read-rare | 90 days |
| `sentinel360-snapshots` | AI-captured snapshots | Write-once, read-frequent | 365 days |
| `sentinel360-evidence` | Approved evidence files | Immutable, read-audited | Permanent |
| `sentinel360-3d-models` | 3D scene reconstructions | Write-once, read-occasional | 365 days |
| `sentinel360-reports` | Generated incident reports | Write-once, read-frequent | Permanent |
| `sentinel360-public` | Public wanted feed images | Read-heavy, CDN-cached | Indefinite |

### 4.5 Search: Elasticsearch (AOS)

| Index | Purpose | Shards |
|-------|---------|--------|
| `cases` | Full-text search across case descriptions, numbers, notes | 3 primary + 2 replicas |
| `criminal-profiles` | Search by name, aliases, physical description | 3 primary + 2 replicas |
| `evidence` | Search evidence descriptions, tags, case references | 3 primary + 2 replicas |
| `audit-logs` | Searchable audit log entries | 3 primary + 2 replicas |

---

## Layer 5: Infrastructure Layer

### 5.1 Edge Infrastructure

```
┌───────────────────────────┐
│         Camera Node        │
│  ┌─────────────────────┐  │
│  │   360° Camera        │  │
│  │   (Insta360 Pro 2 /  │  │
│  │    Ricoh Theta Z1)   │  │
│  └──────────┬──────────┘  │
│             │ RTSP         │
│  ┌──────────▼──────────┐  │
│  │   Edge Compute       │  │
│  │   NVIDIA Jetson Orin  │  │
│  │   ┌────────────────┐ │  │
│  │   │ GPU: 2048-core │ │  │
│  │   │ CPU: 12-core   │ │  │
│  │   │ RAM: 32GB      │ │  │
│  │   │ Storage: 256GB │ │  │
│  │   └────────────────┘ │  │
│  │                      │  │
│  │  Running: docker     │  │
│  │  - frame-grabber     │  │
│  │  - ai-inference      │  │
│  │  - edge-buffer       │  │
│  └──────────────────────┘  │
└───────────────────────────┘
```

### 5.2 Cloud Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster (EKS/GKE)              │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │   Namespace: api         │  │   Namespace: workers     │  │
│  │   ┌───────────────────┐ │  │   ┌───────────────────┐ │  │
│  │   │ api-gateway (Kong)│ │  │   │ video-processor   │ │  │
│  │   │ Replicas: 2-5     │ │  │   │ Replicas: 2-10   │ │  │
│  │   └───────────────────┘ │  │   └───────────────────┘ │  │
│  │   ┌───────────────────┐ │  │   ┌───────────────────┐ │  │
│  │   │ auth-service      │ │  │   │ report-generator  │ │  │
│  │   │ Replicas: 2-4     │ │  │   │ Replicas: 2-3    │ │  │
│  │   └───────────────────┘ │  │   └───────────────────┘ │  │
│  │   ┌───────────────────┐ │  │   ┌───────────────────┐ │  │
│  │   │ case-service      │ │  │   │ confidence-scorer│ │  │
│  │   │ Replicas: 2-4     │ │  │   │ Replicas: 2-4   │ │  │
│  │   └───────────────────┘ │  │   └───────────────────┘ │  │
│  │   ┌───────────────────┐ │  │   ┌───────────────────┐ │  │
│  │   │ ... more services │ │  │   │ alert-dispatcher  │ │  │
│  │   └───────────────────┘ │  │   └───────────────────┘ │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │   Namespace: ai          │  │   Namespace: storage     │  │
│  │   ┌───────────────────┐ │  │   (External services)    │  │
│  │   │ face-reid-service │ │  │   - RDS PostgreSQL       │  │
│  │   │ GPU pod           │ │  │   - ElastiCache Redis   │  │
│  │   └───────────────────┘ │  │   - MSK Kafka           │  │
│  │   ┌───────────────────┐ │  │   - S3                  │  │
│  │   │ 3d-reconstruction │ │  │   - AOS Elasticsearch   │  │
│  │   │ GPU batch job     │ │  │   - CloudFront CDN      │  │
│  │   └───────────────────┘ │  └─────────────────────────┘  │
│  └─────────────────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 CDN Strategy

| Content Type | CDN Behavior | Cache TTL |
|-------------|--------------|-----------|
| Public wanted feed images | Edge-cached, invalidated on status change | 1 hour |
| Case evidence (approved) | Signed URLs, no public cache | 0 (private) |
| 3D model assets (public) | Edge-cached, versioned URLs | 24 hours |
| Application static assets (JS/CSS) | Edge-cached with content hash | 1 year (immutable) |
| API responses (public feed) | CDN + API Gateway cache | 30 seconds |

### 5.4 Networking

| Component | Protocol | Ports |
|-----------|----------|-------|
| Client → API Gateway | HTTPS (TLS 1.3) | 443 |
| Edge → Cloud (Kafka) | SSL/TLS + SASL | 9094 |
| Edge → Cloud (S3) | HTTPS | 443 |
| WebSocket (Alerts) | WSS | 443 |
| Database connections | PostgreSQL SSL | 5432 |
| Redis connections | Redis AUTH + TLS | 6379 |
| Kubernetes API | HTTPS | 6443 |

---

## Inter-Layer Communication Patterns

### Synchronous (Request/Response)
- **Client → API → Service → Database**: Standard CRUD operations
- **Service → Service**: NestJS module calls (in-monolith) or gRPC (post-extraction)
- **Authentication flow**: API Gateway delegates to Auth Service

### Asynchronous (Event-Driven)
- **Video processing pipeline**: Camera → Edge AI → Kafka → Cloud workers → Database
- **Alert lifecycle**: Detection → Kafka → Alert Service → Notification → Delivery tracking
- **Evidence hashing**: Upload → S3 → Kafka → Hasher → Chain-of-Custody record
- **Audit logging**: All services → Kafka → Audit Service → PostgreSQL + Elasticsearch

### Streaming
- **Real-time alerts**: Alert Service → Redis Pub/Sub → WebSocket Server → Client
- **Live feed monitoring**: Camera → Edge → HLS stream → CDN → Security Operator dashboard

---

## Data Flow: End-to-End Example

### Community Member Submits a Sighting

```
1. Community Member captures photo + GPS location via mobile app
2. Mobile app uploads to API Gateway (POST /api/v1/sightings)
3. API Gateway validates JWT, rate-limits, routes to Sighting Service
4. Sighting Service stores metadata in PostgreSQL, image in S3
5. Sighting Service publishes sighting.submitted event to Kafka
6. AI Orchestrator consumes event, triggers face comparison pipeline
7. Face Re-ID service compares against known criminal profiles
8. If match found above threshold → publishes match event
9. Alert Service consumes match → creates alert → dispatches to relevant LE officers
10. Sighting status updated → Community Member notified via push notification
```

---

## ADR-001: Modular Monolith with Extraction Path

### Status
Accepted

### Context
The team has 6 members. The product is in its initial development phase. Domain boundaries are still being discovered (event storming revealed some ambiguity in how cases and evidence relate across jurisdictions). Microservices would impose distributed debugging, eventual consistency, and DevOps overhead that would slow initial delivery.

### Decision
Build as a **modular monolith** in NestJS: each domain is a separate module with its own controller, service, repository, and schema. Modules communicate through service interfaces (not HTTP). Module boundaries are enforced via lint rules (import restrictions via `eslint-plugin-import`). Database tables are namespaced by module.

### Consequences
**Easier:** Faster development velocity, simpler debugging, single deployable unit, atomic database transactions across domains.
**Harder:** Extraction to standalone services requires refactoring. All services scale together. Technology lock-in to a single runtime.

### Extraction Path
When extraction is warranted (e.g., AI Orchestrator needs independent GPU scaling), the boundary modules are already isolated:
1. Extract the module into a standalone NestJS app
2. Add an API layer (gRPC or REST)
3. Replace direct service calls with client stubs
4. Move related database tables to a separate schema (or database)
5. Deploy as a new Kubernetes service

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Software Architect | Initial layered architecture document |
