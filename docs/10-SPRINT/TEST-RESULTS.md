# Automated Test Results

**Date run:** 2026-09-10 16:31 SAST
**Runner:** Vitest 4.1.8 (via `bun run test` → `turbo test` → `vitest run`)
**Package under test:** `packages/api` (`@Sentinel360/api`)
**Command:** `bun run test`

## Summary

| Metric | Value |
| --- | --- |
| Test files | 4 |
| Total tests | **86** |
| Passed | 86 |
| Failed | 0 |
| Duration | ~0.3s |

All 86 tests passed. Of these, **42 are newly added** in this change (`case-status.test.ts`, `case-next-actions.test.ts`); the remaining 44 (`middleware.test.ts`, `validators.test.ts`) already existed in the repo but had no wired-up `test` script to run them.

## What changed to make this runnable

- Added `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `packages/api/package.json` (previously `"scripts": {}` — the existing suite could only be run with `bunx vitest run` from inside the package).
- Added a `test` task to `turbo.json`.
- Added `"test": "turbo test"` to the root `package.json`, so `bun run test` now runs every package's tests from the repo root.

## New test files

### `packages/api/src/__tests__/case-status.test.ts` (21 tests)
Covers `getCaseStatusTransitionError` (`packages/api/src/services/case-status.ts`) — the case lifecycle state machine (`OPEN → UNDER_INVESTIGATION → AWAITING_REVIEW → CLOSED → ARCHIVED`):
- No-op transitions and rejecting transitions outside the allowed map
- Requiring an assigned investigator before starting an investigation
- Requiring evidence before submitting for review
- Requiring closure notes (or a reason) before closing
- Requiring a reason to reopen from `AWAITING_REVIEW` / `CLOSED` / `ARCHIVED`
- The 90-day cooldown before a closed case can be archived (missing `closedAt`, under 90 days, just under 90 days, over 90 days)
- Rejecting an unrecognized target status

### `packages/api/src/__tests__/case-next-actions.test.ts` (21 tests)
Covers `getCaseNextActions` (`packages/api/src/services/case-next-actions.ts`) — the rule-based "what to do next" docket checklist:
- Archived cases return no actions
- Missing investigating officer / evidence / linked persons of interest
- Arrest vs. surveillance suggestion once a suspect is linked
- 48-hour first-appearance window (CPA s50): attention vs. overdue, and picking the most recent arrest
- NPA charge-decision prompts after first appearance and while awaiting review
- Overdue "record the outcome" flag for past-due pending hearings
- Lapsed next-hearing dates with/without a follow-up already booked
- A fully "clean" case with nothing outstanding returns an empty checklist

## Existing test files (already in repo, now wired up)

### `packages/api/src/__tests__/middleware.test.ts` (9 tests)
tRPC middleware guards: `requireRole`, `leoProcedure`, `requirePermission`.

### `packages/api/src/__tests__/validators.test.ts` (35 tests)
Zod schema validation for auth, users, roles, and organizations.

## Full run output

```
 ✓ src/__tests__/case-status.test.ts (21 tests) 6ms
 ✓ src/__tests__/middleware.test.ts (9 tests) 3ms
 ✓ src/__tests__/case-next-actions.test.ts (21 tests) 19ms
 ✓ src/__tests__/validators.test.ts (35 tests) 8ms

 Test Files  4 passed (4)
      Tests  86 passed (86)
   Duration  276ms (transform 146ms, setup 78ms, import 170ms, tests 37ms, environment 0ms)
```

## Notes / follow-ups

- Only `packages/api` has automated tests today. `apps/web`, `apps/native`, `apps/server`, and `apps/ai` have no test setup — none was added here since it would need a separate framework/config per app (Vitest+RTL for web/native, Bun test or Vitest for server, pytest for the `ai` FastAPI service).
- `case-number.ts` and `sighting-number.ts` (DB-backed sequence generators) and `case-timeline.ts` (writes to the audit log) were left untested — they need a scoped Drizzle mock beyond the generic one in `src/__tests__/setup.ts` to exercise meaningfully; worth a follow-up pass.
