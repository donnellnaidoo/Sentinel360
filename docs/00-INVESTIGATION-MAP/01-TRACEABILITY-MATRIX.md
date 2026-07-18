# Sentinel360 — Full Traceability Matrix

> **Document:** Requirements → Implementation → Testing Traceability
> **Group:** Alpha Tech
> **Last Updated:** June 2026

---

## 1. Traceability Key

| Status | Meaning |
|--------|---------|
| ✅ Implemented | Code exists and is functional |
| 🔶 Partial | Skeleton/shell exists; core logic missing |
| 📝 Documented | Spec exists but not implemented |
| ❌ Missing | Not documented or implemented |
| N/A | Not applicable |

---

## 2. Functional Requirements Traceability

### 2.1 FR-01: Real-Time AI Behaviour Detection

| Req ID | Title | Priority | Architecture | API | Backend | Web | Mobile | DB | Tests | Status |
|--------|-------|----------|-------------|-----|---------|-----|--------|----|-------|--------|
| FR-01-001 | Class-Specific Detection | P0 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-01-002 | Continuous Behavioural Inference | P0 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-01-003 | Threat Triggering | P0 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-01-004 | Edge Inference | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |

### 2.2 FR-02: Automated Entity Attribute Extraction

| Req ID | Title | Priority | Architecture | API | Backend | Web | Mobile | DB | Tests | Status |
|--------|-------|----------|-------------|-----|---------|-----|--------|----|-------|--------|
| FR-02-001 | Biometric/Human Extraction | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-02-002 | Physical Description Extraction | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-02-003 | Vehicular Data Extraction | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-02-004 | Extraction Pipeline Integrity | P2 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |

### 2.3 FR-03: Movement Path Tracking & Re-identification

| Req ID | Title | Priority | Architecture | API | Backend | Web | Mobile | DB | Tests | Status |
|--------|-------|----------|-------------|-----|---------|-----|--------|----|-------|--------|
| FR-03-001 | Inter-camera Re-ID | P0 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-03-002 | Chronological Spatial Mapping | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-03-003 | Spatial Heat Mapping | P2 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |

### 2.4 FR-04: 3D Crime Scene Reconstruction

| Req ID | Title | Priority | Architecture | API | Backend | Web | Mobile | DB | Tests | Status |
|--------|-------|----------|-------------|-----|---------|-----|--------|----|-------|--------|
| FR-04-001 | Spatial Synthesis from 360° Video | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-04-002 | Interactive 3D Viewer | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| FR-04-003 | Entity Overlay in 3D Scene | P2 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-04-004 | Evidence Preservation in 3D Models | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |

### 2.5 FR-05: Structured Incident Reporting & Metadata Integration

| Req ID | Title | Priority | Architecture | API | Backend | Web | Mobile | DB | Tests | Status |
|--------|-------|----------|-------------|-----|---------|-----|--------|----|-------|--------|
| FR-05-001 | Automated Evidence Compilation | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-05-002 | Forensic Timestamping | P0 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-05-003 | Trajectory Logs | P1 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-05-004 | LEO Metadata Integration | P1 | 📝 | ❌ | 📝 | ❌ | ❌ | 📝 | ❌ | ❌ |
| FR-05-005 | Report Generation Dashboard | P2 | 📝 | ❌ | ❌ | ❌ | ❌ | 📝 | ❌ | ❌ |

---

## 3. Non-Functional Requirements Traceability

### 3.1 NFR-01: System Performance and Scalability

| Req ID | Title | Priority | Implementation | Status |
|--------|-------|----------|----------------|--------|
| NFR-01-001 | Data Throughput | P0 | 📝 No throughput testing, no benchmark | 📝 |
| NFR-01-002 | Processing Latency | P0 | 📝 No latency measurement infra | 📝 |
| NFR-01-003 | Elastic Scalability | P0 | 📝 No auto-scaling configured | 📝 |
| NFR-01-004 | Resource Efficiency | P2 | 📝 No edge hardware tested | 📝 |

### 3.2 NFR-02: Processing Accuracy and Evidentiary Quality

| Req ID | Title | Priority | Implementation | Status |
|--------|-------|----------|----------------|--------|
| NFR-02-001 | Inference Confidence Thresholds | P0 | ❌ No AI models deployed | ❌ |
| NFR-02-002 | Error Mitigation | P1 | ❌ No false positive/negative measurement | ❌ |
| NFR-02-003 | Model Validation and Versioning | P1 | ❌ No model registry | ❌ |
| NFR-02-004 | Adversarial Robustness | P2 | ❌ No adversarial testing | ❌ |

### 3.3 NFR-03: Data Security and Integrity

| Req ID | Title | Priority | Implementation | Status |
|--------|-------|----------|----------------|--------|
| NFR-03-001 | Cryptographic Chain of Custody | P0 | ❌ Not implemented | ❌ |
| NFR-03-002 | Encryption at Rest | P0 | ✅ Supabase provides AES-256 at rest | ✅ |
| NFR-03-003 | Encryption in Transit | P0 | ✅ TLS via Supabase/Hono | ✅ |
| NFR-03-004 | Role-Based Access Control | P0 | 🔶 Middleware checks roles; no permission resolution service | 🔶 |
| NFR-03-005 | Comprehensive Audit Logging | P1 | 🔶 Super Admin audit log page exists; no backend service | 🔶 |
| NFR-03-006 | Backup and Disaster Recovery | P1 | ✅ Supabase provides automated backups | ✅ |
| NFR-03-007 | Intrusion Detection and Prevention | P2 | ❌ Not implemented | ❌ |

### 3.4 NFR-04: Availability and Reliability

| Req ID | Title | Priority | Implementation | Status |
|--------|-------|----------|----------------|--------|
| NFR-04-001 | System Availability | P0 | ✅ Supabase SLA 99.9%+ | ✅ |
| NFR-04-002 | System Redundancy | P1 | ✅ Supabase managed | ✅ |
| NFR-04-003 | Graceful Degradation | P2 | ❌ Not implemented | ❌ |

### 3.5 NFR-05: Usability and Accessibility

| Req ID | Title | Priority | Implementation | Status |
|--------|-------|----------|----------------|--------|
| NFR-05-001 | UI Responsiveness | P1 | 🔶 Not benchmarked | 🔶 |
| NFR-05-002 | Mobile Accessibility | P2 | 🔶 Mobile app exists but disconnected | 🔶 |
| NFR-05-003 | Accessibility Compliance | P2 | ❌ Not audited | ❌ |

### 3.6 NFR-06: Maintainability and Portability

| Req ID | Title | Priority | Implementation | Status |
|--------|-------|----------|----------------|--------|
| NFR-06-001 | Modular Architecture | P1 | ✅ Monorepo with packages | ✅ |
| NFR-06-002 | Containerisation | P1 | ❌ No Dockerfiles found | ❌ |
| NFR-06-003 | Monitoring and Observability | P1 | ❌ No Prometheus/Grafana | ❌ |

### 3.7 NFR-07: Compliance and Legal

| Req ID | Title | Priority | Implementation | Status |
|--------|-------|----------|----------------|--------|
| NFR-07-001 | Data Protection (POPIA) | P1 | 📝 Documented; not implemented | 📝 |
| NFR-07-002 | Forensic Evidence Standards | P1 | 📝 Referenced; not implemented | 📝 |
| NFR-07-003 | Data Residency | P2 | ✅ Supabase Cape Town region | ✅ |

---

## 4. User Stories Traceability

| ID | Story | Phase | Backend API | Web Page | Mobile Screen | DB Tables | Status |
|----|-------|-------|-------------|----------|---------------|-----------|--------|
| US-01 | Register & Login | 1 | 🔶 Better-Auth configured | ✅ Login page built | ✅ Onboarding + Sign-in/Sign-up | ✅ User, session, account, verification | 🔶 |
| US-02 | View Wanted Feed (Public) | 1 | ❌ No wanted feed endpoint | ✅ Public wanted feed page exists | ✅ Wanted screen exists | 📝 Criminal profiles | 🔶 |
| US-03 | Submit a Sighting | 2 | ❌ No sighting endpoint | ❌ No sighting submission form | ✅ Report screen exists | 📝 Sightings | 🔶 |
| US-04 | Receive Alerts | 2 | ❌ No push notification infra | 🔶 Alerts page exists (static) | ✅ Alerts screen exists | 📝 Alerts, notifications | 🔶 |
| US-05 | View Full Wanted Feed | 1 | ❌ No authenticated feed endpoint | 🔶 Wanted feed page (no auth gating) | ✅ Wanted screen exists | 📝 Criminal profiles | 🔶 |
| US-06 | Submit CCTV Snapshots | 2 | ❌ No evidence upload | 🔶 Evidence upload modal exists | ❌ No native upload | 📝 Evidence | 🔶 |
| US-07 | Receive Operational Alerts | 2 | ❌ No alert routing | 🔶 Alerts page exists | ✅ Alerts screen | 📝 Alerts | 🔶 |
| US-08 | Auto Capture Snapshot | 5 | ❌ No AI pipeline | ❌ Not applicable | ❌ Not applicable | ❌ AI tables not migrated | ❌ |
| US-09 | Assign Confidence Score | 5 | ❌ No AI pipeline | ❌ Not applicable | ❌ Not applicable | ❌ AI tables not migrated | ❌ |
| US-10 | View Wanted Feed (LE) | 1 | ❌ No LE-specific endpoint | 🔶 Same wanted feed page | ✅ Wanted screen | 📝 Criminal profiles | 🔶 |
| US-11 | Verify Snapshots | 2 | ❌ No verification workflow | 🔶 Evidence page with status | ❌ Not applicable | 📝 Evidence | 🔶 |
| US-12 | Verify Sightings | 2 | ❌ No verification workflow | ❌ No sighting detail page | ❌ Not applicable | 📝 Sightings | ❌ |
| US-13 | Update Criminal Status | 2 | ❌ No status update endpoint | ❌ No profile detail page | ❌ Not applicable | 📝 Criminal profiles | ❌ |
| US-14 | Manage Criminal Profiles | 1 | ❌ No profile CRUD | 🔶 Admin profiles page (placeholder) | ❌ Not applicable | 📝 Criminal profiles | 🔶 |
| US-15 | Send Alerts | 2 | ❌ No alert creation endpoint | ❌ No alert creation form | ❌ Not applicable | 📝 Alerts | ❌ |
| US-16 | Verify Snapshots (QC) | 2 | ❌ No verification workflow | 🔶 Evidence verification UI | ❌ Not applicable | 📝 Evidence | 🔶 |
| US-17 | Manage Users & Roles | 1 | 🔶 Better-Auth user management | ✅ Admin users page exists | ❌ Not applicable | ✅ User, role, permission tables | 🔶 |
| US-18 | View Audit Logs | 3 | ❌ No audit log service | ✅ Super Admin audit log page | ❌ Not applicable | 📝 Audit logs | 🔶 |
| US-19 | Manage Criminal Profiles (Super) | 2 | ❌ No profile CRUD | 🔶 No permanent delete/merge UI | ❌ Not applicable | 📝 Criminal profiles | ❌ |

---

## 5. Database Table Traceability

### 5.1 Phase 1: Auth & RBAC (9 tables)

| Table | Schema File | Migration File | Status |
|-------|-------------|----------------|--------|
| users | `packages/db/src/schema/auth.ts` | `0001_initial_schema.sql` | ✅ |
| sessions | `packages/db/src/schema/auth.ts` | `0001_initial_schema.sql` | ✅ |
| accounts | `packages/db/src/schema/auth.ts` | `0001_initial_schema.sql` | ✅ |
| verification | `packages/db/src/schema/auth.ts` | `0001_initial_schema.sql` | ✅ |
| roles | 📝 Docs only | `docs/07-DATABASE/migrations/20260613000003_rbac.sql` | 🔶 Migration file exists |
| permissions | 📝 Docs only | `docs/07-DATABASE/migrations/20260613000003_rbac.sql` | 🔶 |
| user_roles | 📝 Docs only | `docs/07-DATABASE/migrations/20260613000003_rbac.sql` | 🔶 |
| role_permissions | 📝 Docs only | `docs/07-DATABASE/migrations/20260613000003_rbac.sql` | 🔶 |
| organizations | 📝 Docs only | `docs/07-DATABASE/migrations/20260613000003_rbac.sql` | 🔶 |

### 5.2 Phase 2: Profiles & Cases (13 tables)

| Table | Migration File | Status |
|-------|----------------|--------|
| criminal_profiles | `20260613000004_criminal_profiles.sql` | 🔶 Migration file exists |
| profile_biometrics | `20260613000004_criminal_profiles.sql` | 🔶 |
| profile_photos | `20260613000004_criminal_profiles.sql` | 🔶 |
| profile_aliases | `20260613000004_criminal_profiles.sql` | 🔶 |
| profile_known_associates | `20260613000004_criminal_profiles.sql` | 🔶 |
| profile_last_locations | `20260613000004_criminal_profiles.sql` | 🔶 |
| profile_threat_assessments | `20260613000004_criminal_profiles.sql` | 🔶 |
| cases | `20260613000005_cases.sql` | 🔶 |
| case_criminals | `20260613000005_cases.sql` | 🔶 |
| case_evidence | `20260613000005_cases.sql` | 🔶 |
| case_timeline_entries | `20260613000005_cases.sql` | 🔶 |
| case_activity_logs | `20260613000005_cases.sql` | 🔶 |
| case_notes | `20260613000005_cases.sql` | 🔶 |

### 5.3 Phase 3: Evidence & Sightings (6 tables)

| Table | Migration File | Status |
|-------|----------------|--------|
| evidence | `20260613000006_evidence.sql` | 🔶 |
| evidence_chain_of_custody | `20260613000006_evidence.sql` | 🔶 |
| evidence_tags | `20260613000006_evidence.sql` | 🔶 |
| sightings | `20260613000007_sightings.sql` | 🔶 |
| sighting_media | `20260613000007_sightings.sql` | 🔶 |
| sighting_verifications | `20260613000007_sightings.sql` | 🔶 |

### 5.4 Phase 4: Alerts & Community (10 tables)

| Table | Migration File | Status |
|-------|----------------|--------|
| alerts | `20260613000008_alerts.sql` | 🔶 |
| alert_recipients | `20260613000008_alerts.sql` | 🔶 |
| alert_delivery_logs | `20260613000008_alerts.sql` | 🔶 |
| notifications | `20260613000008_alerts.sql` | 🔶 |
| notification_preferences | `20260613000008_alerts.sql` | 🔶 |
| geofences | `20260613000008_alerts.sql` | 🔶 |
| user_geofence_subscriptions | `20260613000008_alerts.sql` | 🔶 |
| community_posts | `20260613000008_alerts.sql` | 🔶 |
| community_comments | `20260613000008_alerts.sql` | 🔶 |
| device_tokens | `20260613000008_alerts.sql` | 🔶 |

### 5.5 Phase 5: AI & Edge (16 tables)

| Table | Migration File | Status |
|-------|----------------|--------|
| ai_model_versions | ❌ Not in migrations | ❌ |
| ai_inference_results | ❌ Not in migrations | ❌ |
| entity_profiles | ❌ Not in migrations | ❌ |
| entity_attributes | ❌ Not in migrations | ❌ |
| face_detections | ❌ Not in migrations | ❌ |
| face_matches | ❌ Not in migrations | ❌ |
| plate_detections | ❌ Not in migrations | ❌ |
| plate_matches | ❌ Not in migrations | ❌ |
| entity_tracks | ❌ Not in migrations | ❌ |
| track_segments | ❌ Not in migrations | ❌ |
| track_camera_transitions | ❌ Not in migrations | ❌ |
| movement_paths | ❌ Not in migrations | ❌ |
| movement_path_points | ❌ Not in migrations | ❌ |
| reconstruction_jobs | ❌ Not in migrations | ❌ |
| reconstruction_models | ❌ Not in migrations | ❌ |
| edge_nodes | ❌ Not in migrations | ❌ |

### 5.6 Phase 6: Integrations & Infra (13 tables)

| Table | Migration File | Status |
|-------|----------------|--------|
| external_integrations | ❌ Not in migrations | ❌ |
| integration_credentials | ❌ Not in migrations | ❌ |
| webhook_endpoints | ❌ Not in migrations | ❌ |
| webhook_delivery_logs | ❌ Not in migrations | ❌ |
| audit_logs (partitioned) | ❌ Not in migrations | ❌ |
| infrastructure_metrics | ❌ Not in migrations | ❌ |
| infrastructure_alerts | ❌ Not in migrations | ❌ |
| system_config | ❌ Not in migrations | ❌ |
| feature_flags | ❌ Not in migrations | ❌ |
| data_retention_policies | ❌ Not in migrations | ❌ |
| data_archives | ❌ Not in migrations | ❌ |
| compliance_reports | ❌ Not in migrations | ❌ |
| export_jobs | ❌ Not in migrations | ❌ |

---

## 6. API Endpoint Traceability

### 6.1 Current Implementation Status

| Router | Planned Endpoints | Implemented | Missing |
|--------|-------------------|-------------|---------|
| **Auth** (Phase 1) | ~8 | 🔶 (Better-Auth handles auth) | tRPC wrappers needed |
| **Users** (Phase 1) | ~9 | 0 | All |
| **Roles** (Phase 1) | ~6 | 0 | All |
| **Organisations** (Phase 1) | ~5 | 0 | All |
| **Profiles** (Phase 2) | ~16 | 0 | All |
| **Cases** (Phase 2) | ~18 | 0 | All |
| **Evidence** (Phase 3) | ~11 | 0 | All |
| **Sightings** (Phase 3) | ~7 | 0 | All |
| **Alerts** (Phase 4) | ~8 | 0 | All |
| **Notifications** (Phase 4) | ~6 | 0 | All |
| **Geofences** (Phase 4) | ~5 | 0 | All |
| **Community** (Phase 4) | ~5 | 0 | All |
| **Devices** (Phase 4) | ~3 | 0 | All |
| **AI** (Phase 5) | ~8 | 0 | All |
| **Tracking** (Phase 5) | ~6 | 0 | All |
| **Reconstruction** (Phase 5) | ~5 | 0 | All |
| **Edge** (Phase 5) | ~5 | 0 | All |
| **Integrations** (Phase 6) | ~7 | 0 | All |
| **Webhooks** (Phase 6) | ~6 | 0 | All |
| **Audit** (Phase 6) | ~4 | 0 | All |
| **System Config** (Phase 6) | ~4 | 0 | All |
| **Compliance/Export** (Phase 6) | ~5 | 0 | All |
| **Infrastructure** (Phase 6) | ~5 | 0 | All |
| **Data Management** (Phase 6) | ~5 | 0 | All |
| **Total** | **~147** | **2** | **~145** |

### 6.2 Currently Implemented Endpoints

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/trpc/healthCheck` | ✅ | Returns "OK" |
| `GET` | `/trpc/privateData` | ✅ | Returns user info (with auth) |
| `POST` | `/api/auth/*` | ✅ | Better-Auth handlers |
| `GET` | `/api/dashboard/stats` | ✅ | Web-only (Supabase REST) |

---

## 7. Web Page Traceability

### 7.1 Phase 1 Pages

| Route | Component | Status | Notes |
|-------|-----------|--------|-------|
| `/` | Landing Page | ✅ | Built with features, stats, CTAs |
| `/login` | Login Page | ✅ | Email/password + OAuth |
| `/forgot-password` | Forgot Password | ✅ | Placeholder |
| `/auth/callback` | Auth Callback | ✅ | OAuth code exchange |
| `/dashboard` | Dashboard | ✅ | Stats cards, recent cases, gauges |
| `/cases` | Case List | ✅ | Bento-grid filters, case table |
| `/docket` | Docket Detail | ✅ | Redirects to SEN-0042 |
| `/evidence` | Evidence Gallery | ✅ | Filter bar, grid view, upload modal |
| `/sightings` | Sightings | 🔶 | "Coming soon" placeholder |
| `/alerts` | Alerts | ✅ | Category cards, severity/status filters |
| `/wanted-feed` | Wanted Feed | ✅ | Suspect cards with match % |
| `/profile` | Profile | 🔶 | "Coming soon" placeholder |
| `/admin/users` | Admin Users | ✅ | DataTable, role editing, pagination |
| `/admin/profiles` | Admin Profiles | 🔶 | Placeholder |
| `/admin/settings` | Admin Settings | 🔶 | Placeholder |
| `/super-admin/audit-logs` | SA Audit Logs | ✅ | Live feed, search, filters |
| `/super-admin/users` | SA Users | 🔶 | Placeholder |

### 7.2 Phase 2–6 Pages (Not Built)

| Route | Phase | Status |
|-------|-------|--------|
| `/register` | 1 | ❌ |
| `/reset-password` | 1 | ❌ |
| `/verify-email` | 1 | ❌ |
| `/admin/users/new` | 1 | ❌ |
| `/admin/users/{id}` | 1 | ❌ |
| `/admin/roles` | 1 | ❌ |
| `/admin/organizations` | 1 | ❌ |
| `/settings` | 1 | ❌ |
| `/wanted` (public) | 2 | ❌ |
| `/profiles` | 2 | ❌ |
| `/profiles/new` | 2 | ❌ |
| `/profiles/{id}` | 2 | ❌ |
| `/profiles/{id}/edit` | 2 | ❌ |
| `/profiles/{id}/merge` | 2 | ❌ |
| `/cases/new` | 2 | ❌ |
| `/cases/{id}/edit` | 2 | ❌ |
| `/evidence/{id}` | 3 | ❌ |
| `/evidence/upload` | 3 | ❌ |
| `/evidence/{id}/chain-of-custody` | 3 | ❌ |
| `/sightings/{id}` | 3 | ❌ |
| `/sightings/review` | 3 | ❌ |
| `/my-sightings` | 3 | ❌ |
| `/admin/evidence` | 3 | ❌ |
| `/alerts/{id}` | 4 | ❌ |
| `/admin/alerts/new` | 4 | ❌ |
| `/admin/geofences` | 4 | ❌ |
| `/notifications` | 4 | ❌ |
| `/community` | 4 | ❌ |
| `/ai/dashboard` | 5 | ❌ |
| `/ai/analysis/{jobId}` | 5 | ❌ |
| `/ai/models` | 5 | ❌ |
| `/tracking` | 5 | ❌ |
| `/tracking/{entityId}` | 5 | ❌ |
| `/reconstruction` | 5 | ❌ |
| `/reconstruction/{jobId}` | 5 | ❌ |
| `/admin` (dashboard) | 6 | ❌ |
| `/admin/integrations` | 6 | ❌ |
| `/admin/webhooks` | 6 | ❌ |
| `/admin/system-config` | 6 | ❌ |
| `/admin/feature-flags` | 6 | ❌ |
| `/admin/infrastructure` | 6 | ❌ |
| `/admin/data/retention` | 6 | ❌ |
| `/admin/compliance` | 6 | ❌ |
| `/admin/export` | 6 | ❌ |

---

## 8. Mobile Screen Traceability

| Screen | Route | Status | Connected to API? |
|--------|-------|--------|-------------------|
| Onboarding | `/onboarding` | ✅ | N/A |
| Sign In | `/sign-in` | ✅ | ❌ (demo credentials) |
| Sign Up | `/sign-up` | ✅ | ❌ |
| Home | `/` (tabs) | ✅ | ❌ (static data) |
| Alerts | `/alerts` | ✅ | ❌ (static data) |
| Wanted | `/wanted` | ✅ | ❌ (static data) |
| Report | `/report` | ✅ | ❌ (static) |
| Profile | `/profile` | 🔶 | ❌ |
| Forgot Password | `/forgot-password` | ❌ | ❌ |
| Verify Email | `/verify-email` | ❌ | ❌ |
| Settings | `/settings` | ❌ | ❌ |
| WantedFeed (detail) | `/profiles/{id}` | ❌ | ❌ |
| ProfileDetail | `/profiles/{id}` | ❌ | ❌ |
| ReportSighting | `/sightings/report` | ❌ | ❌ |
| MySightings | `/sightings/my` | ❌ | ❌ |
| SightingDetail | `/sightings/{id}` | ❌ | ❌ |
| EvidenceList | `/evidence` | ❌ | ❌ |
| EvidenceDetail | `/evidence/{id}` | ❌ | ❌ |
| AlertDetail | `/alerts/{id}` | ❌ | ❌ |
| AlertMap | `/alerts/map` | ❌ | ❌ |
| NotificationScreen | `/notifications` | ❌ | ❌ |
| CommunityFeed | `/community` | ❌ | ❌ |
| CommunityPost | `/community/{id}` | ❌ | ❌ |
| AIAnalysisStatus | `/ai/status` | ❌ | ❌ |
| AIAnalysisDetail | `/ai/status/{jobId}` | ❌ | ❌ |
| EntityTrack | `/tracking` | ❌ | ❌ |

---

## 9. Test Coverage Traceability

| Test Type | Planned | Written | Coverage |
|-----------|---------|---------|----------|
| Unit Tests | ~150 | 0 | 0% |
| Integration Tests | ~40 | 0 | 0% |
| E2E Tests (Playwright) | ~35 | 0 | 0% |
| E2E Tests (Detox) | ~8 | 0 | 0% |
| Python AI Tests | ~8 | 0 | 0% |
| **Total** | **~241** | **0** | **0%** |
