# Sentinel360 — Sprint Report

> **Submission date:** 2026-07-30
> **Sprint focus:** Investigation module (cases/docket) hardening, POPIA compliance, dashboard live data, wanted-profile fields.
> Companion documents: `docs/00-INVESTIGATION-MAP/08-INVESTIGATION-PROCESS-REVIEW.md` (compliance assessment), `SPRINT-DEMO-SCRIPT.md` (live demo script).

---

## 1. Technical Progress

### Investigation module — complete
The case/docket lifecycle is fully implemented end to end and backed by a real state machine, not just UI:

- **Docket administration lifecycle:** `OPEN → UNDER_INVESTIGATION → AWAITING_REVIEW → CLOSED → ARCHIVED`, enforced server-side in `packages/api/src/services/case-status.ts` (can't investigate without an assignee, can't submit for review without linked evidence, can't close without resolution notes, reopening requires a reason).
- **Judicial lifecycle**, modeled separately from docket admin: arrest → first appearance → bail → NPA charge decision → hearings (`packages/api/src/routers/cases.ts` — `caseArrest`, `caseProsecutionDecision`, `caseHearing`), with SA-specific legal fields (`rightsInformedAt` citing Constitution s35(1)(a); `bailScheduleClassification` citing CPA Schedule 1/5/6).
- **Evidence handling:** SHA-256 hash at upload, append-only chain-of-custody ledger, live re-verification (`evidence.verifyIntegrity`) that recomputes and compares hashes on demand — maps to CPA 51/1977 and ECTA s15 admissibility requirements.
- **Sensitive-case access control:** new `case.is_sensitive` flag; a sensitive case and all of its sub-resources (notes, evidence links, suspects, arrests, hearings, timeline) are visible only to the assigned investigator or an admin/super_admin, enforced via `assertCaseVisible()` at the API layer — a hard 403, not a client-side filter.
- **Full frontend:** dedicated docket tabs (Suspects, Evidence, Notes, Timeline, Court), a status stepper that only renders valid next transitions, and a next-steps panel.

Full step-by-step operating instructions: `docs/00-INVESTIGATION-MAP/08-INVESTIGATION-PROCESS-REVIEW.md` §3.

### POPIA compliance — real, working flows
New `packages/api/src/routers/popia.ts` + `data_deletion_request` table:

- `popia.myData` — self-service subject access request (POPIA s23): returns the caller's own cases, notes, sightings, and timeline actions as a real export.
- `popia.requestDeletion` → `popia.reviewDeletionRequest` (POPIA s24): a filed request is admin-reviewed; approval anonymizes personal fields (name, email, phone, image) and deactivates the account, while deliberately retaining case/evidence/audit records under POPIA s11(1)(d)/(f) and CPA evidentiary-retention requirements. Every step is audit-logged.
- Audit log hash chain now canonicalizes object keys recursively (`audit-log.ts`), closing a gap where the previous top-level-only sort would have weakened the tamper-evidence claim.
- Retention: `cases.runRetentionSweep` batch-archives closed cases past the 90-day cutoff in one call (previously one-at-a-time only).

### Dashboard, profiles, and mobile-facing data
- Dashboard now reads live stats instead of placeholders (`apps/web/src/app/api/dashboard/stats/route.ts`, `dashboard/page.tsx`).
- Wanted/criminal profiles gained structured `physicalDescription` and `charges` fields, surfaced through `profiles.listPublicWanted` to both the web wanted-feed and the mobile app.

### Mobile community app (`apps/native`) — MVP, two known rough edges
- **Report a sighting:** the form correctly captures description, location, up to 4 photos, and an anonymous toggle — but the active submit handler currently writes only the description straight to Supabase; the wired real backend call (`trpc.sightings.submit`, which would persist location/photos/anonymity) exists in the file but is commented out. **Not fixed this sprint** — logged as next-sprint work, see §3.
- **Wanted persons:** the community can browse the full public wanted list (photo, description, charges) via a real query (`profiles.listPublicWanted`) — there is no search/filter yet, and the anonymous-tip buttons are UI-only (no handler wired).

### AI detection pipeline — explicitly early-stage
`apps/ai`: person/vehicle detection and tracking (YOLO) is implemented and produces real bounding-box overlays. Facial recognition matching, ALPR, and automatic incident triggers are not built — the project's own README lists them as a later phase. Framed honestly as "under development," not demoed as feature-complete.

---

## 2. Reflections on Challenges

- **Modeling two lifecycles instead of one.** The temptation was to have a single case-status field cover both "where is this docket in our process" and "where is this in the criminal justice system." Keeping them as two explicit state machines (docket admin vs. judicial sequence) took longer but avoided a status field that would eventually have to mean five different things depending on context.
- **POPIA's tension between "right to deletion" and "duty to retain evidence."** A naive SAR/deletion implementation would either refuse all deletions (failing s24) or actually delete evidence tied to open/closed cases (destroying evidentiary and audit records the CPA requires you to keep). The anonymize-but-retain-the-record design took real back-and-forth to land on and cite correctly — it's documented in `docs/00-INVESTIGATION-MAP/08-INVESTIGATION-PROCESS-REVIEW.md` §3.5 rather than left as an assumption.
- **Audit log immutability is harder than "just hash it."** The first version of the audit hash chain sorted only top-level object keys before hashing, which is silently gameable (nested key reordering wouldn't change the hash but would change the semantic content). Catching and fixing that — and being explicit that pre-fix rows aren't retroactively rehashed, since rewriting an append-only ledger defeats its purpose — was a late but important catch.
- **Retention automation stalled on missing infrastructure, not logic.** The 90-day archival rule itself was straightforward; batching it wasn't. There's no job queue/scheduler in the stack yet, so `runRetentionSweep` had to ship as a manually/externally-triggered endpoint rather than a real cron job — an infrastructure gap (GAP-INF-06), not a design gap.
- **A late discovery in the mobile app.** While preparing this submission, we found the sighting-report screen's real backend call is commented out in favor of a direct, partial Supabase write — meaning location, photos, and the anonymous flag are captured in the UI but silently never saved. It wasn't caught earlier because the screen "looks" fully functional; it only surfaces if you inspect the saved record afterward. Left unfixed for this submission by deliberate choice (documentation deadline took priority over a same-day fix under time pressure) and logged explicitly below rather than glossed over.

---

## 3. Plan for Next Sprint

1. **Fix the sighting-submission gap.** Re-wire `reportScreen.tsx` to call the existing `trpc.sightings.submit` procedure so location, photos, and the anonymous flag are actually persisted. The backend endpoint already exists and is correct — this is a frontend wiring fix, not new backend work.
2. **Add search/filter to the wanted-persons list** in the mobile app, on top of the existing `profiles.listPublicWanted` query, and wire the anonymous-tip buttons to a real submission path.
3. **Schedule retention automation.** Stand up minimal job-queue infrastructure (or an external cron hitting `runRetentionSweep`) so archival stops depending on someone remembering to trigger it — closes the residual half of GAP-LEG-03/GAP-INF-06.
4. **Proactive POPIA consent recapture.** Build the frontend banner for legacy accounts with `popiaConsentAt = NULL` to call `popia.giveConsent`, so the mitigation already built on the backend actually reaches existing users.
5. **Decide evidence-level sensitivity.** `evidence.getById`/`evidence.list` can still be queried directly by ID without deriving visibility from the sensitivity of linked cases — scope this properly rather than leaving it as an open side door.
6. **Begin AI phase 2** (facial recognition matching against watchlists) now that detection/tracking is stable, per the phased plan already in `apps/ai/README.md`.
7. **Expand automated test coverage.** Only two test files exist in the repo today (`packages/api/src/__tests__/{middleware,validators}.test.ts`); the case-status state machine and POPIA anonymization path are exactly the kind of logic that should have regression tests before more people touch them.

---

## 4. Technical Artifacts Updated This Sprint

- `docs/00-INVESTIGATION-MAP/00-EXECUTIVE-SUMMARY.md` and `02-GAP-ANALYSIS.md` — added sprint-status banners and corrected stale rows (POPIA, chain of custody, audit immutability, retention) that previously read "documented only" / "not implemented" for things now built. Full remediation detail lives in `docs/00-INVESTIGATION-MAP/08-INVESTIGATION-PROCESS-REVIEW.md`, which these now point to rather than duplicate.
- `docs/00-INVESTIGATION-MAP/08-INVESTIGATION-PROCESS-REVIEW.md` and `SPRINT-DEMO-SCRIPT.md` — already added this sprint; left as the canonical compliance assessment and live-demo references for this submission.
- No database schema or architecture *decisions* changed from what's documented in `docs/02-ARCHITECTURE/` — only implementation status needed correcting, not design.

---

## 5. GitHub Repository

- `README.md` (`docs/`) documents prerequisites, environment variables per app (table of required keys, since no secrets-bearing `.env.example` is committed — `.env` files are correctly gitignored across `apps/web`, `apps/server`, `apps/native`, and root), database setup, and how to run each app individually or together via Turborepo.
- All frontend (`apps/web`, `apps/native`) and backend (`apps/server`, `packages/api`, `packages/db`) code is committed and present in the repository; nothing required for this module lives outside version control.
- `apps/ai` has its own README covering the separate Python/uv setup, since it's on a different toolchain from the rest of the monorepo.

---

## 6. Final Checklist

| Area | Status | Notes / known limitations |
|---|---|---|
| **Investigation module (features)** | ✅ Complete | Full case lifecycle, judicial sequence, evidence chain of custody — see `docs/00-INVESTIGATION-MAP/08-INVESTIGATION-PROCESS-REVIEW.md` |
| **POPIA compliance (SAR + deletion)** | ✅ Functional | s23/s24 flows live and audit-logged; breach-notification workflow not built; legacy consent recapture is opt-in, not proactive |
| **Sensitive-case access control** | ✅ Complete | Hard 403 at the API layer; residual gap — evidence-level reads aren't yet derived from linked-case sensitivity |
| **Retention/archival** | 🟡 Partial | 90-day sweep logic correct; manually triggered, no scheduler yet |
| **Audit logging** | ✅ Complete (going forward) | Canonical hash chain from the fix date forward; pre-fix rows use the older canonicalization |
| **Dashboard** | ✅ Complete | Live data, not placeholders |
| **Mobile — report a sighting** | 🔴 Known bug | Description saves; location/photos/anonymous flag are captured in UI but not persisted (real backend call exists but is disabled) — fix scoped for next sprint |
| **Mobile — wanted persons** | 🟡 Partial (MVP) | Browsing works against the real backend; no search/filter; tip-submission buttons are non-functional |
| **AI detection pipeline** | 🟡 Early stage, by design | Detection/tracking (YOLO) working; facial recognition/ALPR/incident triggers explicitly phase 2, not yet started |
| **Automated tests** | 🔴 Minimal | Two test files in the entire monorepo (`middleware.test.ts`, `validators.test.ts`); no CI workflow configured yet |
| **Security — secrets handling** | ✅ Complete | All `.env` files gitignored; no credentials committed |
| **API surface** | ✅ Complete for this module | `cases`, `evidence`, `popia`, `profiles` routers all live under `packages/api/src/routers/` |

**Overall:** the investigation module and its SA legal/POPIA compliance story are genuinely done and defensible under questioning. The mobile app is an honest MVP with one real bug (sighting save path) and one scoping gap (search), both explicitly logged rather than hidden. The AI pipeline is deliberately early — detection works, recognition doesn't yet, and that's presented as the plan, not a shortfall.
