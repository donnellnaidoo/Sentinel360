# Sentinel360 — Remediation Roadmap

> **Document:** Prioritised Gap Remediation Plan
> **Group:** Alpha Tech
> **Estimated Total Effort:** ~1,150 hours remaining
> **Last Updated:** June 2026

---

## 1. Remediation Prioritisation Model

Each remediation item is scored on:

| Factor | Weight | Scoring |
|--------|--------|---------|
| **Business Value** | 30% | 1–5 (low value → critical value) |
| **Technical Dependency** | 25% | 1–5 (no blockers → blocks everything) |
| **Implementation Effort** | 20% | 1–5 (quick win → major effort) |
| **Risk Reduction** | 15% | 1–5 (cosmetic → legal/security) |
| **SA Legal Requirement** | 10% | 1–5 (nice-to-have → statutory) |

> **Priority Score = (BV × 0.30) + (TD × 0.25) + (IE × 0.20) + (RR × 0.15) + (SA × 0.10)**

---

## 2. Phase 0: Emergency Fixes (Week 1 — ~40 hours)

Critical gaps that must be resolved immediately for any functional progress.

| # | Gap | Task | Owner | Hours | Priority Score |
|---|-----|------|-------|-------|---------------|
| R-01 | GAP-AUTH-01 | Implement tRPC role-based middleware (adminProcedure, leoProcedure, etc.) | Backend | 8 | 4.8 |
| R-02 | GAP-FE-02 | Build typed tRPC React Query hooks for domain entities | Full Stack | 12 | 4.6 |
| R-03 | GAP-INF-05 | Set up MinIO container + configuration for file storage | Backend | 8 | 4.5 |
| R-04 | GAP-INF-06 | Set up Redis container + connection configuration | Backend | 4 | 4.4 |
| R-05 | GAP-LEG-01 | Add privacy policy consent checkbox to registration | Full Stack | 4 | 4.3 |
| R-06 | GAP-TST-05 | Set up test database + fixture seed data | Backend | 4 | 4.2 |

---

## 3. Phase 1: Core Backend Foundation (Weeks 2–4 — ~160 hours)

Build the backend service layer that all frontends depend on.

### 3.1 tRPC Domain Routers

| # | Gap | Task | Owner | Hours |
|---|-----|------|-------|-------|
| R-07 | GAP-PRO-01 | Criminal profile CRUD tRPC router | Backend | 16 |
| R-08 | GAP-PRO-02 | Profile sub-resource routers (photos, aliases, associates, locations) | Backend | 16 |
| R-09 | GAP-CASE-01 | Case CRUD tRPC router | Backend | 16 |
| R-10 | GAP-CASE-02 | Case sub-resource routers (timeline, notes, linking) | Backend | 16 |
| R-11 | GAP-EVI-01 | Evidence CRUD + upload tRPC router | Full Stack | 20 |
| R-12 | GAP-EVI-02 | SHA-256 hashing + chain of custody service | Backend | 14 |
| R-13 | GAP-SIG-01 | Sighting submission tRPC router (with media + GPS) | Full Stack | 16 |
| R-14 | GAP-ALR-01 | Alert creation + delivery tRPC router | Full Stack | 16 |
| R-15 | GAP-AUTH-03 | Wire up email verification flow | Full Stack | 6 |
| R-16 | GAP-AUTH-04 | Wire up password reset flow | Full Stack | 6 |

### 3.2 Database Migrations

| # | Gap | Task | Owner | Hours |
|---|-----|------|-------|-------|
| R-17 | GAP-ALL-DB | Apply all 10 migration files to Supabase | Backend | 4 |
| R-18 | GAP-AI-DB | Create + apply Phase 5 AI tables migrations | Backend | 8 |
| R-19 | GAP-INF-DB | Create + apply Phase 6 infrastructure tables migrations | Backend | 6 |

### 3.3 Phase 1 Total: **~160 hours**

---

## 4. Phase 2: Frontend Integration (Weeks 5–7 — ~160 hours)

Connect all existing pages to live APIs; build missing pages.

### 4.1 Web Frontend

| # | Gap | Task | Owner | Hours |
|---|-----|------|-------|-------|
| R-20 | GAP-FE-01 | Connect dashboard to live stats API via tRPC | Frontend | 8 |
| R-21 | GAP-FE-01 | Connect cases page to live case tRPC router | Frontend | 10 |
| R-22 | GAP-FE-01 | Connect docket page to live case + evidence data | Frontend | 12 |
| R-23 | GAP-FE-01 | Connect evidence page to live evidence tRPC router | Frontend | 10 |
| R-24 | GAP-FE-01 | Connect wanted feed to live profiles/public endpoint | Frontend | 8 |
| R-25 | GAP-FE-01 | Connect alerts page to live alert tRPC router | Frontend | 8 |
| R-26 | GAP-PRO-04 | Build profile detail, create, edit pages | Frontend | 20 |
| R-27 | GAP-CASE-04 | Build case create + edit pages | Frontend | 14 |
| R-28 | GAP-SIG-05 | Build sighting detail + review queue pages | Frontend | 16 |
| R-29 | GAP-FE-03 | Add loading skeletons + error boundaries to all pages | Frontend | 10 |
| R-30 | GAP-EVI-06 | Build chain of custody viewer component | Frontend | 10 |

### 4.2 Mobile Frontend

| # | Gap | Task | Owner | Hours |
|---|-----|------|-------|-------|
| R-31 | GAP-MOB-01 | Build tRPC client + API service layer | Mobile Dev | 10 |
| R-32 | GAP-MOB-02 | Connect auth screens to Better-Auth server | Mobile Dev | 8 |
| R-33 | GAP-MOB-05 | Connect report screen to sighting submission API | Mobile Dev | 10 |
| R-34 | GAP-MOB-01 | Connect alerts, wanted, home screens to live APIs | Mobile Dev | 16 |

### 4.3 Phase 2 Total: **~160 hours**

---

## 5. Phase 3: Real-Time & Notifications (Weeks 8–9 — ~120 hours)

Implement alert delivery, push notifications, and real-time infrastructure.

| # | Gap | Task | Owner | Hours |
|---|-----|------|-------|-------|
| R-35 | GAP-ALR-02 | Integrate Expo Push Notifications + FCM/APNS | Full Stack | 20 |
| R-36 | GAP-ALR-03 | Build WebSocket server with Redis Pub/Sub | Backend | 16 |
| R-37 | GAP-ALR-05 | Build alert routing engine (role/region/preference) | Backend | 14 |
| R-38 | GAP-ALR-04 | Build notification preferences CRUD | Full Stack | 10 |
| R-39 | GAP-ALR-06 | Build geofence CRUD + spatial query service | Backend | 12 |
| R-40 | GAP-ALR-07 | Build community feed API + UI | Full Stack | 16 |
| R-41 | GAP-MOB-03 | Build push notification token registration + handler | Mobile Dev | 12 |
| R-42 | GAP-MOB-04 | Build WebSocket client for live updates | Mobile Dev | 20 |

### Phase 3 Total: **~120 hours**

---

## 6. Phase 4: AI Pipeline (Weeks 10–14 — ~320 hours)

Build the core AI/ML pipeline. This is the largest and most technically complex phase.

| # | Gap | Task | Owner | Hours |
|---|-----|------|-------|-------|
| R-43 | GAP-AI-01 | Set up Python FastAPI microservice + Docker | AI/ML Dev | 20 |
| R-44 | GAP-AI-02 | Build AI orchestration service (Bull queue + result ingestion) | Full Stack | 20 |
| R-45 | GAP-AI-03 | Build model registry API + lifecycle management | Backend | 14 |
| R-46 | GAP-AI-04 | Face detection (YOLOv8) + recognition (ArcFace) pipeline | AI/ML Dev | 40 |
| R-47 | GAP-AI-05 | ALPR pipeline (YOLOv8 plate detection + OCR) | AI/ML Dev | 30 |
| R-48 | GAP-AI-06 | Behaviour anomaly detection (SlowFast/I3D) | AI/ML Dev | 40 |
| R-49 | GAP-AI-07 | Re-ID service (OSNet + FAISS) | AI/ML Dev | 30 |
| R-50 | GAP-AI-09 | Entity tracking + movement path synthesis | Full Stack | 20 |
| R-51 | GAP-AI-08 | 3D reconstruction pipeline (COLMAP + NeRF) | AI/ML Dev | 40 |
| R-52 | GAP-SIG-03 | Connect sighting AI matching queue | Full Stack | 10 |
| R-53 | GAP-AI-10 | Edge node registration + heartbeat + health | Backend | 12 |
| R-54 | GAP-FE-ALL | Build AI dashboard, tracking map, 3D viewer pages | Frontend | 44 |

### Phase 4 Total: **~320 hours**

---

## 7. Phase 5: Compliance & Integrations (Weeks 15–16 — ~120 hours)

Implement audit, export, compliance, and external integration infrastructure.

| # | Gap | Task | Owner | Hours |
|---|-----|------|-------|-------|
| R-55 | GAP-LEG-05 | Build immutable audit log service (partitioned) | Backend | 16 |
| R-56 | GAP-LEG-03 | Build data retention policy engine + auto-archive | Backend | 12 |
| R-57 | GAP-LEG-02 | Align export schemas with SAPS standards | Full Stack | 16 |
| R-58 | GAP-LEG-04 | Build cryptographic evidence integrity verification tool | Backend | 10 |
| R-59 | GAP-LEG-01(2) | Build SAR API + data export for individuals | Full Stack | 10 |
| R-60 | GAP-LEG-01(3) | Build data deletion request workflow | Full Stack | 10 |
| R-61 | GAP-EVI-05 | Build pre-signed download URL service | Backend | 6 |
| R-62 | GAP-EVI-ALL | Build evidence case linking + export | Full Stack | 10 |
| R-63 | GAP-INF-ALL | Build system config + feature flag service | Backend | 10 |
| R-64 | GAP-INF-ALL | Build external integration + webhook engine | Backend | 20 |
| R-65 | GAP-AUTH-06 | Implement TOTP 2FA for Super Admin | Full Stack | 10 |

### Phase 5 Total: **~120 hours**

---

## 8. Phase 6: Infrastructure & Testing (Weeks 17–18 — ~130 hours)

Production hardening, CI/CD, monitoring, and comprehensive testing.

| # | Gap | Task | Owner | Hours |
|---|-----|------|-------|-------|
| R-66 | GAP-INF-01 | Create Dockerfiles for all services | DevOps | 10 |
| R-67 | GAP-INF-02 | Set up GitHub Actions CI/CD pipeline | DevOps | 12 |
| R-68 | GAP-INF-03 | Set up Prometheus + Grafana + structured logging | DevOps | 16 |
| R-69 | GAP-INF-04 | Configure staging environment | DevOps | 8 |
| R-70 | GAP-INF-07 | Set up CDN for media delivery | DevOps | 6 |
| R-71 | GAP-INF-08 | Write disaster recovery runbook | DevOps | 8 |
| R-72 | GAP-TST-01 | Write unit tests for all services | All | 20 |
| R-73 | GAP-TST-02 | Write integration tests for all API flows | All | 16 |
| R-74 | GAP-TST-03 | Write Playwright E2E tests for critical journeys | Frontend | 16 |
| R-75 | GAP-TST-04 | Write Python AI microservice tests | AI/ML Dev | 10 |
| R-76 | GAP-AUTH-05 | Implement account lockout mechanism | Backend | 4 |
| R-77 | GAP-AUTH-07 | Build organisation management API + UI | Full Stack | 8 |
| R-78 | GAP-FE-05 | Run accessibility audit + fix violations | Frontend | 10 |
| R-79 | GAP-LEG-06 | Document data residency policy + add cross-border blocks | PM/BA | 4 |

### Phase 6 Total: **~130 hours**

---

## 9. Cumulative Effort Summary

| Phase | Name | Hours | Weeks | Team Size |
|-------|------|-------|-------|-----------|
| **P0** | Emergency Fixes | 40 | 1 | 3 |
| **P1** | Core Backend Foundation | 160 | 3 | 3 |
| **P2** | Frontend Integration | 160 | 3 | 3 |
| **P3** | Real-Time & Notifications | 120 | 2 | 3 |
| **P4** | AI Pipeline | 320 | 5 | 3 |
| **P5** | Compliance & Integrations | 120 | 2 | 3 |
| **P6** | Infrastructure & Testing | 130 | 2 | 3 |
| **Total** | | **1,050** | **18** | |

> **Note:** AI pipeline (Phase 4) represents 30% of total remaining effort. If AI is scoped back, ~320 hours can be deferred, bringing MVP to ~730 hours.

---

## 10. Recommended Team Allocation

| Role | Phases | Focus |
|------|--------|-------|
| **Backend Developer** | P0–P6 | tRPC routers, services, DB, AI orchestration |
| **Frontend Developer** | P0–P3, P5–P6 | Web pages, API integration, E2E tests |
| **Full Stack Developer** | P1–P5 | Mobile+web bridges, media upload, alerting |
| **AI/ML Developer** | P4 | Python microservice, model training, inference |
| **DevOps** | P6 | Docker, CI/CD, monitoring, infra |
| **PM / BA** | All | Documentation, compliance, coordination |

---

## 11. Dependency Graph

```
P0: Emergency
 │
 ├──► P1: Core Backend ──────────────────────────────────────┐
 │     │                                                      │
 │     ├──► P2: Frontend Integration                          │
 │     │     │                                                │
 │     │     ├──► P3: Real-Time & Notifications               │
 │     │     │     │                                          │
 │     │     │     ├──► P5: Compliance & Integrations         │
 │     │     │     │     │                                    │
 │     │     │     │     └──► P6: Infrastructure & Testing    │
 │     │     │     │                                          │
 │     │     └────► P4: AI Pipeline (parallel after P1)       │
 │     │           │                                          │
 │     │           └──► P6: Infrastructure & Testing          │
 │     │                                                      │
 │     └──────────────────────────────────────────────────────┘
```

---

## 12. Risk-Adjusted Timeline

| Scenario | Timeline | Notes |
|----------|----------|-------|
| **Best Case** (all resources available) | 12 weeks | Full team of 5, no blockers |
| **Expected Case** (some constraints) | 18 weeks | 3–4 person team, typical delays |
| **Worst Case** (resource constraints) | 28 weeks | 2-person team, AI scope reduction |

---

## 13. Key Milestones

| Milestone | Phase | Week | Deliverable |
|-----------|-------|------|-------------|
| M1 | P0 | 1 | Role-based middleware, MinIO, Redis, test DB |
| M2 | P1 | 4 | All core tRPC routers + migrations applied |
| M3 | P2 | 7 | All web pages connected to live APIs; mobile connected |
| M4 | P3 | 9 | Push notifications + WebSocket operational |
| M5 | P4 | 14 | AI pipeline producing results (face, ALPR, tracking) |
| M6 | P5 | 16 | Audit log, chain of custody, SAPS export operational |
| M7 | P6 | 18 | CI/CD, monitoring, tests passing; production-ready |
