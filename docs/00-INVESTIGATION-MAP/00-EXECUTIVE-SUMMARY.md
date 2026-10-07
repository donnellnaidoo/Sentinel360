# Sentinel360 — Investigation Map: Executive Summary

> **Document:** Investigation Map — Complete Gap Analysis & Traceability
> **Group:** Alpha Tech
> **Jurisdiction:** Republic of South Africa
> **Last Updated:** June 2026

> **⚠️ Sprint status update (2026-07-29):** this snapshot predates the current sprint's work on
> the investigation module. The tables below still read "documented only" / "not implemented" for
> several items that are now built and live — the case/evidence/POPIA/profiles tRPC routers,
> chain-of-custody hashing, sensitive-case access control, and the POPIA SAR/deletion API. For the
> current, code-verified status of the investigation (case/docket) process specifically, see
> `INVESTIGATION-PROCESS-REVIEW.md` at the repo root — it supersedes §3.2/§3.3 below for that
> module. This document has not been fully rewritten for time; treat the tables as historical
> baseline, not current state.

---

## 1. Purpose

This document suite maps the entire Sentinel360 investigation from end to end, ensuring **zero gaps** between requirements, architecture, implementation, testing, and compliance. Every requirement, user story, domain entity, API endpoint, screen, and database table is traced and its implementation status assessed.

---

## 2. The Investigation Landscape

Sentinel360 is a **multi-layered surveillance intelligence platform** operating within the South African legal framework. The investigation spans:

| Layer | Scope | Status |
|-------|-------|--------|
| **Requirements** | 5 functional areas, 7 NFR categories, 19 user stories | Fully documented |
| **Architecture** | 8 architecture domains (system, layered, DB, API, security, AI, deployment, components) | Fully documented |
| **Domain Model** | 10 bounded contexts (auth, RBAC, profiles, cases, evidence, sightings, alerts, AI, media, edge) | Fully documented |
| **Backend** | 8 implementation areas (setup, DB, auth, API, models, services, testing, file structure) | Partially implemented |
| **Frontend Web** | 10 design areas (setup, components, routes, docket, pages, state, API, theme, testing, files) | Partially implemented |
| **Mobile App** | 3 areas (overview, screens, API integration) | Skeleton implemented |
| **Database** | 67 tables across 6 phases + 10 migration files | Partially migrated |
| **Infrastructure** | Deployment guide + edge infrastructure | Documented only |
| **Implementation** | 6 phases, ~1,478 estimated hours | ~10-15% complete |

---

## 3. Critical Findings Summary

### 3.1 What Exists (Implemented)

| Component | Details |
|-----------|---------|
| **Monorepo scaffolding** | Turborepo + Bun + TypeScript fully configured |
| **Database auth schema** | Drizzle ORM: user, session, account, verification tables |
| **Domain SQL migrations** | 10 migration files covering all 67 tables |
| **Better-Auth** | Configured with Drizzle adapter, email/password, OAuth |
| **tRPC setup** | Context with session extraction, public + protected procedures |
| **Web middleware** | Route protection with role-based access maps |
| **Web pages (built)** | Landing, Login, Dashboard, Cases, Docket, Evidence, Sightings(placeholder), Alerts, Wanted Feed, Profile(placeholder), Admin Users, Admin Profiles(placeholder), Admin Settings(placeholder), Super Admin Audit Logs, Super Admin Users(placeholder) |
| **Web API route** | Dashboard stats (Supabase REST) |
| **UI components** | 16 shared shadcn components |
| **Mobile screens** | Onboarding, Sign-in, Sign-up, Home, Alerts, Wanted, Report, Profile(placeholder) |
| **Mobile auth** | Better-Auth Expo client, demo credentials |

### 3.2 What's Missing (Critical Gaps)

| Gap | Severity | Details |
|-----|----------|---------|
| **No tRPC domain routers** | Critical | Only healthCheck + privateData exist; no cases, evidence, profiles, sightings, alerts routers |
| **No backend service layer** | Critical | No business logic for any domain entity |
| **Mobile not connected to server** | Critical | Demo credentials; no real API calls |
| **No AI pipeline** | Critical | No Python microservice, no model registry, no inference |
| **No chain of custody** | High | No SHA-256 hashing, no immutable audit on evidence |
| **No push notifications** | High | No FCM/APNS integration |
| **No WebSocket/realtime** | High | No real-time alerting infrastructure |
| **No file storage** | High | No S3/MinIO setup for evidence uploads |
| **No geofencing** | Medium | No spatial alert targeting |
| **No community features** | Medium | No community posts, comments, feed |
| **No external integrations** | Medium | No SAPS/LEO system integration |
| **No export/compliance** | Medium | No XML/JSON export, no compliance reports |
| **No performance optimisation** | Medium | No caching, CDN, query optimisation |

### 3.3 SA Legal Compliance Gaps

| Requirement | Status | Gap |
|-------------|--------|-----|
| **POPIA compliance** | 🟡 Mitigated (2026-07-29) | SAR + deletion API live (s23/s24); no breach notification workflow, legacy consent recapture is opt-in not proactive |
| **SAPS data standards** | Documented only | No XSD schema alignment, no integration testing |
| **Data residency (SA borders)** | On Supabase (AWS Cape Town) | Compliant, but no documented policy enforcement |
| **Chain of custody** | ✅ Implemented | SHA-256 hash at upload + immutable custody ledger + live integrity re-verification |
| **Audit logging** | ✅ Implemented, canonical hash chain | Immutable going forward; pre-fix rows use an older canonicalization (see GAP-LEG-05) |
| **Evidence retention (7 years)** | 🟡 Mitigated (2026-07-29) | 90-day closed→archived sweep exists but is manually triggered, not scheduled; broader 7-year policy not yet automated |
| **RBAC enforcement** | Partially (middleware checks roles) | No granular permission resolution service |
| **ISO/IEC 27037** | Referenced in NFR | No implementation plan |

---

## 4. Traceability Overview

The full traceability matrix (see separate document `01-TRACEABILITY-MATRIX.md`) maps every:
- **Functional Requirement** (FR-01-NNN) → Implementation status
- **Non-Functional Requirement** (NFR-XX-NNN) → Implementation status
- **User Story** (US-NN) → Implementation status
- **Database table** → Migration status
- **API endpoint** → Implementation status
- **Web page** → Built status
- **Mobile screen** → Built status
- **Test case** → Written status

---

## 5. Key Metrics

| Metric | Value |
|--------|-------|
| Total functional requirements | 15 |
| Total non-functional requirements | 30 |
| Total user stories | 19 |
| Total database tables (all phases) | 67 |
| Total API endpoints (all phases) | ~147 |
| Total web pages (all phases) | ~60 |
| Total mobile screens (all phases) | ~26 |
| Estimated total effort | ~1,478 hours |
| Estimated completed effort | ~180 hours (~12%) |
| Estimated remaining effort | ~1,298 hours (~88%) |

---

## 6. Document Index

| Doc # | Name | Description |
|-------|------|-------------|
| 00 | `00-EXECUTIVE-SUMMARY.md` | This document |
| 01 | `01-TRACEABILITY-MATRIX.md` | Full requirements → implementation traceability |
| 02 | `02-GAP-ANALYSIS.md` | Detailed gap analysis per domain |
| 03 | `03-SA-LEGAL-COMPLIANCE.md` | South African legal framework compliance assessment |
| 04 | `04-REMEDIATION-ROADMAP.md` | Prioritised remediation plan with effort estimates |
| 05 | `05-DATA-FLOW-MAP.md` | End-to-end data flow diagrams |
| 06 | `06-SECURITY-ASSESSMENT.md` | Security posture assessment |
