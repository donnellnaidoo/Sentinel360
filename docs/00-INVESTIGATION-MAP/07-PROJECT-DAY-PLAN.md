# Sentinel360 — Project Day Plan

> **Document:** Solo 4-Week Execution Plan (AI/CCTV Deferred)
> **Group:** Alpha Tech
> **Owner:** Solo, ~1 month to project day
> **Last Updated:** July 2026

---

## 1. Purpose

This is the actionable, near-term plan that sits on top of `04-REMEDIATION-ROADMAP.md`. That roadmap assumes a 3-5 person team and ~1,050 remaining hours — not realistic for a solo developer with one month. This document re-prioritises the same gaps for that constraint, with AI/CCTV detection deferred to last, as directed.

The goal is not full "1,050-hour" completion. It is: a coherent, demo-able system with no visibly fake data anywhere, backed by real compliance and engineering practices that differentiate it from other student projects.

---

## 2. Current State (verified against code, not docs — July 2026)

### 2.1 Real and working

| Domain | Status |
|--------|--------|
| Auth (Supabase) | Working, web + native |
| RBAC (roles/permissions) | Working, seeded, enforced via `requirePermission`/`requireRole` |
| POPIA consent capture | Working, captured at signup, stored on `user.popia_consent_at` |
| Cases domain | Full CRUD, status state machine, notes, incident linking, timeline — wired to web |
| Evidence domain | Upload, SHA-256 hashing, chain of custody, integrity verification, signed downloads — wired to web |
| Audit log | Hash-chained tamper-evident writer exists in `packages/auth/src/audit.ts` |

### 2.2 Backend exists but nothing renders it

`users`, `roles`, `organizations`, `profiles`/watchlist tRPC routers are built and tested, but these pages are still static mockups with zero tRPC calls:
- `apps/web/src/app/(dashboard)/admin/users/page.tsx`
- `apps/web/src/app/(dashboard)/admin/roles/page.tsx`
- `apps/web/src/app/(dashboard)/admin/organizations/page.tsx`
- `apps/web/src/app/(dashboard)/admin/profiles/page.tsx`
- `apps/web/src/app/(dashboard)/super-admin/audit-logs/page.tsx` (no read router exists yet either)

### 2.3 Completely missing — no schema, no router, no wiring

- **Alerts** domain (`apps/web/src/app/(dashboard)/alerts/page.tsx` is static)
- **Sightings / community reporting** domain (`apps/web/src/app/(dashboard)/sightings/page.tsx` and native `report.tsx` are static)
- **Wanted feed** (`wanted-feed/page.tsx` is static)

These map directly to core functional requirements ("Real-Time Alerts and Notifications," "Community Members submit sightings") and currently don't exist at all.

### 2.4 Native app

Entirely unwired beyond sign-in/sign-up. Home, alerts, wanted, report, profile screens are all static with zero backend calls.

### 2.5 Uncommitted work risk

159 files of uncommitted changes are sitting in the working tree, spanning many past sessions (new docs restructure, new web auth/dashboard routes, new packages). Git history currently shows nothing since commit `fb5fe0d`. This needs to land as a readable series of commits, not one dump at the end — a marker checking git log should see real incremental work.

### 2.6 AI/CCTV

Not built, by design. Deferred to the very end of this plan.

---

## 3. The "industry standard" tension

Full industry-grade **scale** (load testing, 24/7 monitoring, SOC 2-level controls) is not achievable, and not meaningful for a demo project — chasing it burns the month on things no judge can observe.

Industry-grade **practices** are achievable and are the actual differentiator: real RBAC, a tamper-evident audit trail, cryptographic chain of custody, POPIA-grounded compliance workflows, CI, and a system where nothing on screen is fake data. That combination is rare at capstone level and outweighs an AI demo with no legal/engineering grounding underneath it.

---

## 4. Four-Week Plan

### Week 1 — Close the breadth gap

The biggest risk to "looks unfinished" is empty/static pages next to fully-wired ones. Priority: every core domain minimally live end-to-end.

| Task | Detail |
|------|--------|
| Build `sightings` domain | Schema + router + native report screen + web review queue. Currently the mobile app's only citizen-facing feature does nothing. |
| Build `alerts` domain | Schema + router + web alerts page + native alerts tab. Simple polling is sufficient for a demo — no WebSocket required. |
| Wire existing admin routers | `users`, `roles`, `organizations`, `profiles` routers already work — connect them to their pages. Fast wins, no new backend logic. |
| Audit log read endpoint | Add `audit:read`-gated query, wire the super-admin audit-logs page. |
| Wire native screens | Home, alerts, wanted, profile — connect to real data (sign-in/sign-up already wired). |

### Week 2 — Compliance depth (the actual competitive edge)

| Task | Detail |
|------|--------|
| SAR endpoint | Self-service "download my data" for any authenticated user. |
| Deletion/erasure workflow | Respects the evidence-retention exception already designed into the case status machine. |
| Archival sweep | The CLOSED→ARCHIVED (90-day) rule is already enforced in `case-status.ts` — build the runner that actually executes it. |
| Breach notification runbook | Documented procedure — POPIA requires this; most groups won't have it. |
| Data residency policy doc | Confirm and document Supabase region (Cape Town) and enforcement. |

### Week 3 — Hardening that reads as "production-minded"

| Task | Detail |
|------|--------|
| Account lockout | Schema already has `failed_login_attempts` — wire the enforcement check. |
| Rate limiting + security headers | Auth endpoints especially; lock down CORS. |
| Basic CI | GitHub Actions: typecheck + test on push. Cheap, highly visible credibility signal. |
| Dockerfile | For the server, even if not deployed — shows deployability. |
| Commit hygiene | Land the 159 uncommitted files as a real, readable commit history. |

### Week 4 — Polish, demo data, and an honest AI story

| Task | Detail |
|------|--------|
| UI polish pass | Loading/error states audited across every page. |
| Realistic seed data | SA-flavored demo data — no placeholder/lorem-ipsum visible anywhere. |
| Simulated detection ("AI story") | Not a real model. A "Simulate Detection" trigger posts a detection event in the exact shape a real CV pipeline would emit (bounding box, confidence, entity match), flowing through the real alert pipeline into a real dashboard alert. State plainly to judges: "the model is mocked, the pipeline it plugs into is real." Standard, honest way to demo unbuilt ML without hand-waving the architecture. |
| Demo rehearsal | Full dry-run of the demo script, multiple times. |

---

## 5. Explicit non-goals for this plan

- No real AI/ML model training or inference before project day
- No WebSocket/real-time push infrastructure (polling is sufficient for a demo)
- No production monitoring/observability stack (Prometheus/Grafana)
- No multi-region or high-availability infrastructure work
- No attempt at full P4 (AI Pipeline, ~320h) or P6 (Infra & Testing, ~130h) scope from `04-REMEDIATION-ROADMAP.md` — those remain the reference for post-project-day work if the system continues past the course.

---

## 6. Milestone Checklist

- [ ] Week 1: sightings + alerts domains live; admin pages wired; native app wired
- [ ] Week 2: SAR, deletion workflow, archival sweep, breach/residency docs written
- [ ] Week 3: account lockout, rate limiting, CI green, Dockerfile, clean commit history
- [ ] Week 4: seed data, simulated-detection demo path, full rehearsal complete
