# Sentinel360 — Detailed Gap Analysis

> **Document:** Gap Analysis Across All System Domains
> **Group:** Alpha Tech
> **Last Updated:** June 2026

---

## 1. Gap Severity Classification

| Severity | Definition | Action Required |
|----------|------------|----------------|
| **Critical** | Blocks core functionality or security | Immediate remediation |
| **High** | Significant feature/security gap | Address in current phase |
| **Medium** | Important but non-blocking | Schedule in next phase |
| **Low** | Enhancement or optimisation | Defer to future release |

---

## 2. Domain-by-Domain Gap Analysis

### 2.1 Authentication & Authorisation

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-AUTH-01 | No tRPC auth middleware for role-based guards | **Critical** | Only public/protected procedures; no role-based access control | Implement role guards: `adminProcedure`, `leoProcedure`, `securityProcedure` |
| GAP-AUTH-02 | No permission resolution service | **High** | Roles stored in app_metadata; no granular permission checking | Build permission resolver that checks `user_roles` + `role_permissions` tables |
| GAP-AUTH-03 | No email verification flow | **High** | Better-Auth configured but email verification endpoint not wired | Implement verify-email page and API integration |
| GAP-AUTH-04 | No password reset flow | **High** | Forgot password page exists (placeholder); no backend wiring | Connect to Better-Auth forgot/reset password flow |
| GAP-AUTH-05 | No account lockout mechanism | **Medium** | Configured in system_config doc but not implemented | Implement `failed_login_attempts` tracking and auto-lockout |
| GAP-AUTH-06 | No TOTP/2FA for Super Admin | **Medium** | Requires 2FA per NFR-03-004 but not implemented | Add TOTP setup flow for Super Admin |
| GAP-AUTH-07 | No organisation management | **Medium** | Organisations table in migration but no API or UI | Build organisation CRUD API + web UI |

### 2.2 Criminal Profiles

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-PRO-01 | No profile CRUD API | **Critical** | No tRPC routers for profiles | Implement create, read, update, delete, list, search |
| GAP-PRO-02 | No profile sub-resource APIs | **Critical** | No photo, biometric, alias, associate, location, threat assessment endpoints | Implement all sub-resource routers |
| GAP-PRO-03 | No public wanted feed endpoint | **High** | Public wanted feed page exists but uses static/mock data | Build `/api/v1/profiles/public` tRPC router |
| GAP-PRO-04 | No profile detail web page | **High** | Profile list page exists (placeholder); no detail/edit views | Build profile detail, create, edit, merge pages |
| GAP-PRO-05 | No profile merge functionality | **Medium** | Documented in requirements; not implemented | Build merge wizard with conflict resolution |
| GAP-PRO-06 | No biometric data management UI | **Medium** | Documented in Phase 2; not implemented | Build biometric viewer/editor component |

### 2.3 Cases (Dockets)

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-CASE-01 | No case CRUD API | **Critical** | No tRPC routers for cases | Implement create, read, update, delete, list, search |
| GAP-CASE-02 | No case sub-resource APIs | **Critical** | No timeline, notes, activity, criminal-linking, evidence-linking endpoints | Implement all sub-resource routers |
| GAP-CASE-03 | No case status workflow enforcement | **High** | Status documented but no state machine | Implement status transition validation (open → under_investigation → closed) |
| GAP-CASE-04 | No case create/edit web forms | **High** | Case list and docket detail exist; no create/edit UI | Build case create and edit pages |
| GAP-CASE-05 | No docket timeline backend | **High** | Docket page shows timeline structure; no API integration | Build timeline CRUD API + connect frontend |
| GAP-CASE-06 | No case number generation | **Medium** | Sequential format `S360-2026-NNNNN` documented but not implemented | Build auto-incrementing case number service |

### 2.4 Evidence Management

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-EVI-01 | No evidence upload service | **Critical** | Upload modal exists but no backend | Build multipart upload with S3/MinIO storage |
| GAP-EVI-02 | No SHA-256 chain of custody | **Critical** | NFR-03-001 requires it; not implemented | Implement cryptographic hashing + immutable chain-of-custody service |
| GAP-EVI-03 | No evidence CRUD API | **Critical** | Evidence page shows static data | Build evidence routers (list, detail, upload, download, stream) |
| GAP-EVI-04 | No evidence verification workflow | **High** | Evidence page has status badges; no backend workflow | Build verify/reject/re-analyse pipeline |
| GAP-EVI-05 | No pre-signed download URLs | **High** | Evidence files not accessible for download | Implement time-limited URL generation |
| GAP-EVI-06 | No chain of custody viewer | **Medium** | Documented in Phase 3; not built | Build visual chain-of-custody timeline component |
| GAP-EVI-07 | No evidence tag system | **Low** | Tag table exists; no API or UI | Build tag CRUD + tag-based filtering |

### 2.5 Sightings

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-SIG-01 | No sighting submission API | **Critical** | Report screen exists on mobile; no backend | Build sighting submission with media, GPS, anonymous option |
| GAP-SIG-02 | No sighting verification workflow | **High** | Documented in US-12; not implemented | Build verify/duplicate/false-report decision flow |
| GAP-SIG-03 | No AI matching queue for sightings | **High** | Sightings should trigger AI matching; no queue | Build Bull queue + AI service integration |
| GAP-SIG-04 | No my-sightings page | **Medium** | Community users can't track their submissions | Build "My Sightings" list with status badges |
| GAP-SIG-05 | No sighting detail page (web) | **Medium** | Sighting list is placeholder; no detail view | Build sighting detail with map, photos, verification form |
| GAP-SIG-06 | No reference number generation | **Medium** | Sightings need unique reference numbers | Build `S360-%Y-NNNNNN` generator |

### 2.6 Alerts & Notifications

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-ALR-01 | No alert creation/delivery service | **Critical** | Alerts page is static; no backend | Build alert CRUD + targeting + delivery engine |
| GAP-ALR-02 | No push notification infrastructure | **Critical** | No FCM/APNS integration | Integrate Expo Push Notifications + FCM/APNS |
| GAP-ALR-03 | No WebSocket real-time infrastructure | **High** | No real-time alert delivery | Build WebSocket server with Redis Pub/Sub |
| GAP-ALR-04 | No notification preferences | **Medium** | Users can't configure notification channels | Build notification preference CRUD |
| GAP-ALR-05 | No alert routing engine | **High** | No role/region/user-group targeting | Build recipient resolver service |
| GAP-ALR-06 | No geofence management | **Medium** | Geofences documented; not implemented | Build geofence CRUD + spatial queries |
| GAP-ALR-07 | No community feed | **Medium** | Community_posts table exists; no API or UI | Build community feed CRUD |

### 2.7 AI Pipeline

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-AI-01 | No Python AI microservice | **Critical** | FR-01, FR-02, FR-03, FR-04 all depend on this | Build FastAPI service with YOLOv8, ArcFace, ALPR, behaviour, Re-ID, reconstruction pipelines |
| GAP-AI-02 | No AI orchestration service | **Critical** | No queue management for AI jobs | Build Node.js orchestration service with Bull queue |
| GAP-AI-03 | No AI model registry | **High** | No model version management | Build model registry API + lifecycle management |
| GAP-AI-04 | No face detection/recognition pipeline | **Critical** | Core of US-08, US-09; not built | Build YOLOv8 + ArcFace pipeline |
| GAP-AI-05 | No ALPR pipeline | **Critical** | Core of FR-02-003; not built | Build YOLOv8 license plate detection + OCR |
| GAP-AI-06 | No behaviour anomaly detection | **High** | Core of FR-01; not built | Build SlowFast/I3D anomaly detection |
| GAP-AI-07 | No Re-ID service | **High** | Core of FR-03; not built | Build OSNet + FAISS Re-ID pipeline |
| GAP-AI-08 | No 3D reconstruction pipeline | **High** | Core of FR-04; not built | Build COLMAP + NeRF pipeline |
| GAP-AI-09 | No entity tracking service | **High** | No movement path synthesis | Build entity track + segment + transition service |
| GAP-AI-10 | No edge node management | **Medium** | Edge infrastructure documented; not built | Build edge node registration, heartbeat, health |

### 2.8 Frontend Web

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-FE-01 | Pages not connected to live APIs | **Critical** | All pages use static/mock data | Connect all pages to tRPC routers |
| GAP-FE-02 | No API client layer for tRPC | **High** | No tRPC React Query hooks for domain entities | Build typed tRPC client hooks for each domain router |
| GAP-FE-03 | No error/loading states on pages | **High** | Many pages lack proper loading skeletons and error boundaries | Add React Query loading/error handling to all pages |
| GAP-FE-04 | No state management beyond React Query | **Medium** | No global state for auth, notifications, theme | Implement Zustand or Context for global state |
| GAP-FE-05 | No accessibility audit | **Medium** | Not tested against WCAG 2.1 AA | Run axe-core audit; fix violations |
| GAP-FE-06 | No performance benchmarking | **Low** | Not measured against NFR-05-001 targets | Run Lighthouse CI; optimise |

### 2.9 Mobile App

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-MOB-01 | Not connected to backend API | **Critical** | All screens use hardcoded demo data | Build API client layer; replace all demo data with real API calls |
| GAP-MOB-02 | No real authentication | **Critical** | Uses demo credentials; no server connection | Connect auth screens to Better-Auth server endpoints |
| GAP-MOB-03 | No push notification registration | **High** | No device token registration | Build push token registration + handler |
| GAP-MOB-04 | No real-time updates | **High** | No WebSocket connection | Integrate WebSocket client for live alerts/updates |
| GAP-MOB-05 | No sighting submission to server | **High** | Report screen captures data locally only | Submit sightings via API with media upload |
| GAP-MOB-06 | No offline support | **Medium** | No offline caching strategy | Implement offline-first with local storage + sync |
| GAP-MOB-07 | No deep linking | **Medium** | Notifications can't deep-link to screens | Configure Expo Router deep linking |

### 2.10 Infrastructure & DevOps

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-INF-01 | No Docker containerisation | **High** | NFR-06-002 requires it; no Dockerfiles | Create Dockerfiles for server, web, mobile builds, AI service |
| GAP-INF-02 | No CI/CD pipeline | **High** | No GitHub Actions or similar | Set up CI: lint, typecheck, test, build, deploy |
| GAP-INF-03 | No monitoring/observability | **High** | NFR-06-003 requires it; not implemented | Set up Prometheus + Grafana + structured logging |
| GAP-INF-04 | No staging environment | **Medium** | Only production Supabase and local dev | Configure staging Supabase project + deployment |
| GAP-INF-05 | No S3/MinIO for file storage | **Critical** | No object storage for evidence uploads | Set up MinIO container + integration |
| GAP-INF-06 | No Redis instance | **High** | Required for Bull queues, caching, WebSocket Pub/Sub | Add Redis to docker-compose + configure |
| GAP-INF-07 | No CDN configuration | **Low** | No content delivery for media | Configure CloudFront or equivalent |
| GAP-INF-08 | No disaster recovery runbook | **Medium** | NFR-03-006 requires it; not documented | Write DR runbook with restore procedures |

### 2.11 Testing

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-TST-01 | No unit tests | **Critical** | Zero test files across entire codebase | Write unit tests for all services, validation, middleware |
| GAP-TST-02 | No integration tests | **Critical** | Zero integration tests | Write integration tests for all API flows |
| GAP-TST-03 | No E2E tests | **High** | No Playwright or Detox tests | Write E2E tests for critical user journeys |
| GAP-TST-04 | No AI model tests | **High** | No Python test suite | Write accuracy benchmarks + unit tests |
| GAP-TST-05 | No test infrastructure | **High** | No test DB, no test fixtures | Set up test PostgreSQL + seed fixtures |

### 2.12 Compliance & Legal (SA Context)

| Gap ID | Description | Severity | Current State | Required State |
|--------|-------------|----------|---------------|----------------|
| GAP-LEG-01 | No POPIA compliance implementation | **Critical** | Documented in NFR-07-001; no implementation | Build consent management, SAR API, breach notification, data minimisation |
| GAP-LEG-02 | No SAPS data standard alignment | **High** | FR-05-004 requires alignment; no XSD/JSON Schema | Align export schemas with SAPS standards |
| GAP-LEG-03 | No data retention enforcement | **High** | NFR-03-005 requires 7-year retention; no policy engine | Build configurable retention policy + auto-archive |
| GAP-LEG-04 | No evidence integrity verification | **Critical** | NFR-03-001 requires SHA-256 chain; not implemented | Build hash verification tool for court evidence |
| GAP-LEG-05 | No audit log immutability | **High** | US-18 requires immutable logs; not enforced | Build append-only audit log with WORM storage |
| GAP-LEG-06 | No data residency enforcement | **Medium** | NFR-07-003 requires SA-based storage; Supabase Cape Town OK | Document data location policy; add cross-border transfer blocks |

---

## 3. Gap Impact Matrix

```
                       IMPACT
              Low    Medium    High    Critical
     ┌──────────────────────────────────────┐
E    │          GAP-FE-06                   │
f   M│ GAP-EVI-07         GAP-PRO-06       │
f   e│                   GAP-AI-03         │
o   d│                   GAP-ALR-06        │
r   i│                   GAP-INF-07        │
t   u│                   GAP-MOB-06        │
    m│                                      │
     ├──────────────────────────────────────┤
    H│ GAP-AUTH-05    GAP-AUTH-02   GAP-    │
    i│ GAP-AUTH-06    GAP-PRO-03   AUTH-03  │
    g│ GAP-INF-04     GAP-CASE-03  GAP-     │
    h│ GAP-FE-04      GAP-EVI-04   AUTH-04  │
     │ GAP-MOB-07     GAP-SIG-02   GAP-     │
     │ GAP-LEG-06     GAP-ALR-03   CASE-04  │
     │                GAP-ALR-05   GAP-     │
     │                GAP-EVI-05   EVI-04   │
     │                GAP-LEG-05   GAP-     │
     │                GAP-FE-03    SIG-03   │
     │                GAP-TST-05   GAP-     │
     │                GAP-INF-06   AI-03    │
     │                            GAP-     │
     │                            AI-06    │
     │                            GAP-     │
     │                            INF-05   │
     ├──────────────────────────────────────┤
    C│ GAP-AI-10              GAP-PRO-01 GAP-AUTH-01
    r│ GAP-FE-05              GAP-PRO-02 GAP-EVI-01
    i│ GAP-LEG-03             GAP-CASE-01 GAP-EVI-02
    t│                        GAP-CASE-02 GAP-ALR-01
    i│                        GAP-SIG-01 GAP-ALR-02
    c│                        GAP-SIG-04 GAP-AI-01
    a│                        GAP-MOB-01 GAP-AI-02
    l│                        GAP-MOB-02 GAP-AI-04
     │                        GAP-MOB-03 GAP-AI-05
     │                        GAP-INF-01 GAP-AI-07
     │                        GAP-INF-02 GAP-AI-08
     │                        GAP-INF-03 GAP-AI-09
     │                        GAP-TST-01 GAP-FE-01
     │                        GAP-TST-02 GAP-FE-02
     │                        GAP-LEG-01 GAP-MOB-05
     │                        GAP-LEG-02 GAP-TST-03
     │                        GAP-LEG-04 GAP-TST-04
     │                                   GAP-LEG-01
     └──────────────────────────────────────┘
```

---

## 4. Cumulative Gap Summary

| Severity | Count | Total Effort (est.) |
|----------|-------|---------------------|
| **Critical** | ~25 | ~500 hours |
| **High** | ~30 | ~400 hours |
| **Medium** | ~20 | ~200 hours |
| **Low** | ~5 | ~50 hours |
| **Total** | **~80** | **~1,150 hours** |
