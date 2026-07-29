# Investigation Process — Compliance Assessment & Operating Instructions

> Assessment of how logical and South African law-compliant the Sentinel360 investigation
> (case/docket) process is, based on the actual implementation — not just the design docs.
> Sources reviewed: `packages/db/src/schema/cases.ts`, `packages/api/src/routers/cases.ts`,
> `packages/api/src/routers/evidence.ts`, `packages/api/src/services/case-status.ts`,
> `packages/api/src/services/chain-of-custody.ts`, `packages/api/src/services/audit-log.ts`,
> `packages/db/src/migrations/0005_popia_consent.sql`, and
> `docs/00-INVESTIGATION-MAP/03-SA-LEGAL-COMPLIANCE.md`.
>
> **Update:** four of the six gaps below have since been remediated — see
> [§3.5](#35-remediation-implemented) for what changed and what residual limitations remain.

---

## 1. Is the process logical?

Yes — it's a genuinely well-reasoned design, not a token gesture. Three things stand out:

- **Two lifecycles kept separate on purpose.** `case-status.ts` has a docket-administration
  state machine (`OPEN → UNDER_INVESTIGATION → AWAITING_REVIEW → CLOSED → ARCHIVED`) with real
  guards: can't start investigating without an assigned investigator, can't submit for review
  without linked evidence, can't close without resolution notes, reopening always demands a
  reason, archiving is blocked until 90 days after closure. Separately, `cases.ts` models the
  **judicial** sequence — arrest → first appearance → bail → NPA charge decision → hearings —
  as its own set of tables (`caseArrest`, `caseProsecutionDecision`, `caseHearing`). The code
  comment explicitly notes these track different things: docket admin vs. the actual criminal
  justice process. That's the correct distinction and most systems conflate it.
- **Evidence is treated as evidence, not a file upload.** Every evidence item gets a SHA-256
  hash at upload (`chain-of-custody.ts`), every access/transfer/verification appends an
  immutable row to a chain-of-custody ledger, and a failed integrity re-check is _recorded_,
  not swallowed — the comment says "a failed check is itself evidence, not an error to hide."
  That maps directly onto Criminal Procedure Act 51/1977 and ECTA s15 admissibility
  requirements.
- **SA-specific legal detail is baked into the schema**, not bolted on: `caseArrest.rightsInformedAt`
  cites Constitution s35(1)(a) (right to be informed of the reason for arrest);
  `caseHearing.bailScheduleClassification` cites CPA Schedule 1/5/6; a code comment references
  the s50 48-hour first-appearance rule.

---

## 2. Where it falls short of full compliance

| Gap                                           | Evidence (as originally found)                                                                                                                                                                                          | Why it matters                                                                                                                                                 | Status                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **No sensitive-case access restriction**      | Domain doc (`04-cases-domain.md`) documents an `is_sensitive` flag restricting visibility to investigators/admins; the actual `case` table (`cases.ts` schema) had no such column, and no query anywhere filtered on it | POPIA condition 6 (security safeguards) — any authenticated user with `cases:read` could see every case, sensitive or not                                       | ✅ Closed                  |
| **Audit ledger is explicitly non-canonical**  | `audit-log.ts` comment: _"good enough for a demo audit trail, not a legally-canonical hash chain (nested object key order isn't normalized)"_                                                                          | Undercuts the CPA/ECTA admissibility story the chain-of-custody work is trying to build — a defence advocate could challenge the hash chain's integrity claim | ✅ Closed (going forward)  |
| **POPIA consent gap for existing users**      | Migration `0005_popia_consent.sql` comment: backfilled `NULL`, "a known compliance gap, not remediated retroactively"                                                                                                  | POPIA s11 requires a lawful basis for processing; pre-migration accounts have none on record                                                                    | 🟡 Mitigated               |
| **No Subject Access Request / deletion API**  | No such router existed in `packages/api/src/routers/`                                                                                                                                                                  | POPIA s23/s24 rights (access, correction, deletion) weren't exercisable by a data subject at all                                                                | ✅ Closed                  |
| **No automated retention enforcement**        | Only the 90-day closed→archived gate was enforced one case at a time; no batch job existed                                                                                                                            | POPIA condition 4 (retention limitation) was policy-only                                                                                                        | 🟡 Mitigated               |
| **No SAPS schema alignment**                  | `case_share_record` table exists (hashed, agreement-referenced inter-agency sharing) but no SAPS XML/JSON export format was found                                                                                     | Blocks real interoperability with SAPS case management, though the sharing _mechanism_ is sound                                                                 | ⬜ Still open              |

**Net assessment:** the investigation _workflow logic_ is sound and unusually well-aligned to SA
criminal procedure for a project at this stage. The _data-protection_ side (POPIA rights,
sensitive-case isolation, retention automation) has now largely caught up — see §3.5 for what
changed and the residual limitations on the "mitigated" rows.

---

## 3. How to run an investigation end-to-end in Sentinel360 today

This follows the actual `casesRouter` procedures in `packages/api/src/routers/cases.ts`, in the
order the state machine requires.

1. **Open the case** — `cases.create` (needs `cases:create`). Auto-generates the case number,
   sets status `OPEN`, and writes the first timeline + audit entry via `recordCaseEvent`. Set
   `isSensitive: true` at creation if the case involves an informant, minor, or otherwise
   warrants restricted visibility — see §3.5.
2. **Assign an investigator** — `cases.update` to set `assignedToUserId`. Required before you
   can move past `OPEN` (`case-status.ts` blocks `OPEN → UNDER_INVESTIGATION` with no assignee).
3. **Link the originating incident** (if one exists) — `cases.linkIncident`.
4. **Start the investigation** — `cases.updateStatus` → `UNDER_INVESTIGATION`.
5. **Collect evidence** — `evidence.upload` (hashes the file, stores it, writes a `CREATED`
   custody event) then `cases.linkEvidence` to attach it to the case. Every later download goes
   through `evidence.getDownloadUrl`, which logs an `ACCESSED` custody event automatically —
   don't distribute evidence any other way, or it breaks the chain.
6. **Identify persons of interest** — `cases.linkCriminal` with a role (`suspect`, `witness`,
   `victim`, etc.).
7. **Record an arrest, if made** — `cases.recordArrest`. Capture `rightsInformedAt` at the time
   of arrest — the schema exists specifically to evidence compliance with Constitution
   s35(1)(a); don't leave it blank.
8. **Add investigative notes as you go** — `cases.addNote` (`noteType`:
   general/interview/surveillance/forensic/legal).
9. **Submit for review** — `cases.updateStatus` → `AWAITING_REVIEW`. Blocked until at least one
   evidence item is linked.
10. **NPA charge decision** — `cases.recordProsecutionDecision` once the prosecutor decides to
    charge, decline, or refer.
11. **Court hearings** — `cases.scheduleHearing` for each appearance (first appearance, bail,
    trial dates), then `cases.recordHearingOutcome` after each one. For bail hearings, populate
    `bailScheduleClassification` per CPA Schedule 1/5/6 — it changes what bail conditions are
    legally available.
12. **Close the case** — `cases.updateStatus` → `CLOSED` with resolution notes (mandatory; the
    transition is rejected without them).
13. **Archive** — `cases.updateStatus` → `ARCHIVED`, only permitted 90 days after `closedAt`
    (or in bulk via `cases.runRetentionSweep` — see §3.5).
14. **Verify evidence integrity at any point (e.g., before trial)** — `evidence.verifyIntegrity`,
    which re-hashes the stored bytes, compares to the original hash, and records the result
    either way via `evidenceIntegrityCheck` + a `VERIFIED` custody event.
15. **Reopen if new evidence surfaces** — `cases.updateStatus` back to `UNDER_INVESTIGATION`
    from `CLOSED` or `ARCHIVED`; a reason is mandatory (enforced in `case-status.ts`).

Full history at any time: `cases.timeline` (human-readable feed) and
`evidence.getCustodyChain` (evidentiary chain for a specific item) — both are pure reads off
data that every step above wrote automatically, so nothing needs manual logging.

---

## 3.5 Remediation implemented

What changed, gap by gap:

### ✅ Sensitive-case access restriction — closed

- `case.is_sensitive` column added (`packages/db/src/migrations/0009_case_sensitivity_flag.sql`,
  `packages/db/src/schema/cases.ts`), exposed on `cases.create`/`cases.update`.
- `packages/api/src/routers/cases.ts` now has `assertCaseVisible()` / `sensitiveCaseVisibilityCondition()`:
  a sensitive case is visible only to its `assignedToUserId` or a user with the `admin`/`super_admin`
  role. `list` filters at the SQL level; `getById` and every sub-resource read/write
  (notes, incidents, evidence links, suspects, arrests, prosecution decisions, hearings, timeline)
  routes through `getCaseOrThrow(id, ctx)`, which enforces the same check — so the restriction
  can't be bypassed by going through a sub-resource endpoint instead of `getById`.
- **Residual scope note:** this restricts the *case* record and its sub-resources. It does not
  extend to `evidence.getById`/`evidence.list`, which can still be queried by evidence ID directly
  without knowing which case(s) it's linked to or whether that case is sensitive — evidence items
  themselves have no sensitivity flag. Closing that fully would mean deriving evidence visibility
  from all cases it's linked to via `case_evidence`, which wasn't in scope for this pass.

### ✅ Audit hash chain canonicalization — closed going forward

- `packages/api/src/services/audit-log.ts#canonicalValue()` now recursively sorts object keys at
  every nesting level (arrays keep their element order; only object keys are reordered), so the
  hash chain is a true canonical hash rather than the previous top-level-only sort.
- **Residual limitation:** this only affects rows written *after* the fix. Rows written before it
  used the old top-level-only canonicalization — they are not rehashed, since doing so would mean
  rewriting an append-only ledger, which defeats the point of it being tamper-evident. If any
  pre-fix rows are ever relied on in court, disclose which canonicalization version produced them.

### ✅ POPIA Subject Access Request / deletion API — closed

- New router `packages/api/src/routers/popia.ts`, new table `data_deletion_request`
  (`packages/db/src/migrations/0010_popia_deletion_requests.sql`,
  `packages/db/src/schema/popia.ts`):
  - `popia.myData` (self-service, POPIA s23) — returns the caller's profile, consent timestamp,
    cases reported/assigned, notes authored, sightings submitted, and case-timeline actions tied
    to their account.
  - `popia.requestDeletion` (POPIA s24) — files a request; does **not** auto-delete.
  - `popia.listDeletionRequests` / `popia.reviewDeletionRequest` (admin) — approving anonymizes
    the profile fields with no independent retention basis (name, email, phone, image) and
    deactivates the account, while deliberately leaving case/evidence/audit_log/timeline rows
    intact — POPIA s11(1)(d)/(f) permits retaining personal information necessary for a legal
    obligation or legitimate interest, and CPA 51/1977 evidentiary retention is exactly that for
    investigation records. Rejecting or approving is final — a request can't be reviewed twice.

### 🟡 POPIA consent gap for existing users — mitigated, not closed

- `popia.giveConsent` lets a signed-in user with `popiaConsentAt = NULL` record consent now. It's
  additive only (never overwrites an existing timestamp) and audit-logged.
- **Residual limitation:** this requires the user to actively call it (e.g. via a re-consent
  banner the frontend would need to show — not built in this pass). Accounts that never call it
  stay `NULL`. This is a mitigation (a path to close the gap exists), not a retroactive fix — you
  still can't manufacture historical consent for an action nobody consented to at the time.

### 🟡 Automated retention enforcement — mitigated, not closed

- `packages/api/src/services/retention.ts#sweepCaseRetention()` + `cases.runRetentionSweep`
  (`superAdminProcedure`) batch-archives every `CLOSED` case past the 90-day cutoff in one call,
  instead of requiring `cases.updateStatus` per case.
- **Residual limitation:** it's manually triggered, not scheduled. There's no job queue/cron/Redis
  infrastructure in this codebase yet (`docs/00-INVESTIGATION-MAP/02-GAP-ANALYSIS.md` GAP-INF-06),
  so an operator (or an external cron hitting this endpoint) has to invoke it periodically. It
  also only covers the case-archival rule — there's still no 7-year auto-anonymisation/deletion
  job for POPIA condition 4 more broadly.

### ⬜ SAPS schema alignment — still open, out of scope for this pass

Not attempted. Aligning `case_share_record` exports to the actual SAPS docket/XML/JSON standard
requires the real SAPS CMS import specification (field names, code tables, transport contract),
which isn't available in this repo or its docs — `docs/00-INVESTIGATION-MAP/02-GAP-ANALYSIS.md`
GAP-LEG-02 flags the same absence. Fabricating a schema without that spec would create false
confidence rather than real interoperability, so this is left explicitly open pending that input
(e.g. from a SAPS integration partner or MOU).

---

## 4. Recommended next steps

1. Build the frontend re-consent banner that calls `popia.giveConsent` for accounts with
   `popiaConsentAt = NULL`, so the mitigation in §3.5 actually reaches existing users.
2. Wire `cases.runRetentionSweep` to a real scheduler once job-queue infrastructure exists
   (GAP-INF-06), and extend automated retention beyond case archival to the broader 7-year POPIA
   retention/anonymisation policy.
3. Decide whether evidence-level reads (`evidence.getById`/`evidence.list`) need their own
   sensitivity derivation from linked cases, given the residual scope note in §3.5.
4. Obtain the actual SAPS CMS integration spec before attempting SAPS schema alignment — don't
   guess at the format.
