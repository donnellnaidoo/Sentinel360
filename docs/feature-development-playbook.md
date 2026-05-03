# Sentinel360 Feature Development Playbook

A practical, end-to-end guide for building production-quality features in a modern full-stack monorepo.

> **Who this is for**
> Full-Stack Developers, Frontend Developers, and Backend Developers working across `apps/*` and `packages/*`.

---

## 1. 🌱 Feature Development Lifecycle

### Standard Flow

1. Clarify the feature ticket and acceptance criteria.
2. Identify impacted domain(s), app(s), and package(s).
3. Create a branch from `main`.
4. Implement backend contract and logic.
5. Integrate frontend UI and state handling.
6. Add or update tests.
7. Run type checks, linting, and local verification.
8. Open PR with clear context and risk notes.
9. Address review comments.
10. Merge, deploy, and monitor.

### Git Workflow Conventions

| Item           | Convention                      | Example                                      |
| -------------- | ------------------------------- | -------------------------------------------- |
| Branch naming  | `type/domain-short-description` | `feat/incident-case-timeline`                |
| Commit style   | Conventional commits            | `feat(api): add incident timeline procedure` |
| PR title       | Short, outcome-focused          | `feat: add incident timeline view + API`     |
| Merge strategy | Squash merge (recommended)      | One clean commit on `main`                   |

### Real Command Examples

```bash
# Sync with latest main
 git checkout main
 git pull origin main

# Create feature branch
 git checkout -b feat/identity-session-audit

# During development
 bun run check-types
 bun run test
 bun run dev

# Stage and commit
 git add .
 git commit -m "feat(auth): add session audit events"

# Push and open PR
 git push -u origin feat/identity-session-audit
```

### PR Definition of Ready

- [ ] Scope is limited to one feature or one coherent vertical slice
- [ ] Acceptance criteria are testable
- [ ] API contract changes are documented
- [ ] Migration impact is identified (if DB changes exist)

### PR Definition of Done

- [ ] Reviewer can verify behavior locally
- [ ] Tests and type checks pass
- [ ] Breaking changes are explicitly called out
- [ ] Monitoring/logging impact is included

---

## 2. 🧩 Project Structure Philosophy

### Monorepo Intent

The repository is organized to separate app delivery from shared platform logic.

| Layer                | Responsibility                                | Typical Location          |
| -------------------- | --------------------------------------------- | ------------------------- |
| App layer            | User-facing apps and app-specific composition | `apps/web`, `apps/native` |
| Server runtime       | HTTP server and API serving                   | `apps/server`             |
| Shared API contracts | Routers, shared procedure wiring              | `packages/api`            |
| Data layer           | DB schema, migrations, query primitives       | `packages/db`             |
| Auth layer           | Authentication and session logic              | `packages/auth`           |
| UI system            | Shared design primitives/components           | `packages/ui`             |
| Environment          | Typed env access per runtime                  | `packages/env`            |
| Domain docs          | Domain behavior and use cases                 | `docs/domains`            |

### Separation of Concerns Rules

- App folders compose features; they do not hold deep business logic.
- Domain/business rules belong in backend-centric packages and procedures.
- Shared types/contracts should be generated or exported from one source of truth.
- UI components in shared packages should remain business-agnostic.
- Database schema changes should be isolated from UI changes where possible.

### Feature Placement Heuristic

Use this quick decision table:

| If the change is...                | Put it in...                                |
| ---------------------------------- | ------------------------------------------- |
| UI screen/page behavior only       | `apps/web/src/app/*` or `apps/native/app/*` |
| Reusable UI primitive              | `packages/ui/src/components/*`              |
| API route/procedure and validation | `packages/api/src/routers/*`                |
| DB schema or query changes         | `packages/db/src/schema/*`                  |
| Auth/session policy                | `packages/auth/src/*`                       |

---

## 3. 🔗 How Everything Connects (CRITICAL)

### End-to-End Flow

`Frontend UI` -> `Client API caller` -> `API procedure/endpoint` -> `Domain/business logic` -> `Database`

### Typical Request Lifecycle

1. User triggers action in frontend (button/form interaction).
2. Frontend validates immediate UI constraints.
3. Frontend calls typed API client (tRPC/REST).
4. Backend procedure validates request schema.
5. Backend authorizes the actor/session.
6. Backend executes business rules.
7. Backend reads/writes DB.
8. Backend returns a typed response (or typed error).
9. Frontend updates state and renders success/error/loading states.

### Example Lifecycle (Create Incident)

```text
Web Form Submit
  -> trpc.incident.create.mutate(input)
  -> API validates input with schema
  -> API checks user permissions
  -> API inserts incident row + audit event
  -> API returns incident summary DTO
  -> Frontend updates list cache and navigates to incident detail page
```

### Connection Patterns

| Concern        | Frontend                     | Backend                            |
| -------------- | ---------------------------- | ---------------------------------- |
| Contract       | Generated/shared types       | Source-of-truth schemas/procedures |
| Validation     | UX-friendly pre-checks       | Authoritative validation           |
| Error handling | Friendly messages + retry UI | Structured error codes             |
| State sync     | Cache invalidation/re-fetch  | Deterministic writes               |

---

## 4. 🧑‍💻 Role-Based Development Guides

### 🟣 Full-Stack Developer Guide

#### Goal

Deliver one feature as a vertical slice from database and API to UI behavior.

#### Recommended Workflow

1. Read acceptance criteria and define data contract.
2. Add or update backend schema/procedure.
3. Expose typed response DTO.
4. Implement frontend integration using that contract.
5. Add tests for procedure + UI behavior.
6. Run full local checks and submit PR.

#### Contract-First Pattern

- Define input and output types before implementation.
- Keep contract stable while iterating internals.
- Version or deprecate fields rather than silently changing shapes.

#### Alignment Checks

- [ ] Procedure input type matches frontend payload
- [ ] Response type matches UI assumptions
- [ ] Error codes are mapped to user-friendly messages
- [ ] Authorization logic is tested

#### Example Vertical Slice

```bash
# 1) Add backend procedure + schema updates
# 2) Update API exports/types
# 3) Consume procedure in web/native client
# 4) Add tests and run checks
bun run test
bun run check-types
```

---

### 🔵 Frontend Developer Guide

#### API Consumption Best Practices

- Always use typed API clients/hooks.
- Keep API calling logic near feature modules, not spread across unrelated components.
- Convert transport models to UI models only when needed.

#### State Management Rules

- Server state: handled via query/mutation caching strategy.
- UI state: local component state for ephemeral interactions.
- Cross-page state: only when necessary; avoid global state by default.

#### UI/UX Consistency Guidelines

- Reuse shared primitives from `packages/ui`.
- Follow consistent spacing, typography, status colors, and action hierarchy.
- Keep forms predictable: label, helper text, validation, success/failure states.

#### Error and Loading Handling

- Every async view must define:
  - Loading state
  - Empty state
  - Error state
  - Success/ready state

> **Tip**
> Treat error states as first-class UX, not fallback UI.

#### Component Structure Pattern

```text
feature/
  components/
    feature-card.tsx
    feature-form.tsx
  hooks/
    use-feature-query.ts
  utils/
    feature-mappers.ts
  index.ts
```

Frontend quality checklist:

- [ ] No unbounded re-renders from unstable props/functions
- [ ] API errors surfaced with useful copy
- [ ] Accessibility baseline covered (labels, keyboard, focus)
- [ ] Shared component library used where applicable

---

### 🟢 Backend Developer Guide

#### Endpoint/Procedure Design

- Start with explicit input/output schema.
- Design around domain use cases, not database tables.
- Keep handlers thin; move rules to domain services/modules if needed.

#### Validation and Business Logic

- Validation prevents malformed input.
- Business logic enforces domain invariants and transitions.
- Do not rely on frontend validation for correctness or security.

#### Database Interaction Patterns

- Prefer explicit select fields over `select *` style patterns.
- Keep transactions for multi-step writes that must stay atomic.
- Record audit events for sensitive changes.

#### Security and Authorization

- Authenticate first, authorize second.
- Enforce least privilege per procedure/endpoint.
- Sanitize and classify errors (avoid leaking internals).

> **Warning**
> Missing authorization checks in one endpoint can invalidate every frontend permission guard.

Backend quality checklist:

- [ ] Input schema present and strict
- [ ] Authorization enforced and tested
- [ ] DB queries are indexed/scalable for expected load
- [ ] Logs include request correlation metadata

---

## 5. 🧠 Feature Design Principles

### Core Principles

1. Build features as modular units with clear boundaries.
2. Depend on contracts, not internal implementation details.
3. Keep business logic close to domain modules, not UI components.
4. Prefer composition over inheritance-heavy abstractions.
5. Optimize for readability and maintainability first.

### Anti-Coupling Rules

- Do not make frontend depend on DB schema internals.
- Do not leak persistence concerns into public API shapes.
- Do not let one feature mutate another feature's private state directly.

### Reusability Patterns

- Shared UI: reusable presentational primitives.
- Shared API contracts: typed DTOs and schemas.
- Shared utils: pure functions with test coverage.

### Naming Conventions

| Artifact             | Convention                 | Example                           |
| -------------------- | -------------------------- | --------------------------------- |
| Feature folders      | kebab-case                 | `incident-timeline`               |
| React components     | PascalCase filename export | `IncidentTimelineCard`            |
| Procedures/endpoints | action-oriented            | `createIncident`, `listIncidents` |
| DB columns           | snake_case                 | `created_at`                      |
| Types/interfaces     | PascalCase                 | `IncidentSummary`                 |

---

## 6. 🔐 Contracts & Types (VERY IMPORTANT)

### Contract Rules

- Define schemas and types once at the API boundary.
- Derive frontend consumption types from backend contract exports.
- Avoid duplicate hand-written types across layers.

### Breaking Change Prevention

Use this compatibility model:

| Change Type                 | Safe? | Notes                        |
| --------------------------- | ----- | ---------------------------- |
| Add optional response field | Yes   | Non-breaking                 |
| Remove response field       | No    | Breaking; requires migration |
| Rename field without alias  | No    | Breaking                     |
| Tighten input validation    | Maybe | Could break existing clients |

### Contract Evolution Strategy

1. Add new fields as optional.
2. Deprecate old fields with timeline.
3. Update clients.
4. Remove deprecated fields in a planned release.

### Versioning Guidance

- Internal-only apps: prefer strict coordinated releases over premature API versioning.
- External/public consumers: use explicit versioning (`v1`, `v2`) and deprecation windows.

### Practical Safeguards

- [ ] Type checks run across all apps/packages before merge
- [ ] Contract changes are listed in PR description
- [ ] Consumers are updated in same PR when feasible

---

## 7. 🧪 Testing Strategy

### Test Pyramid for Features

| Test Type   | Purpose                        | Example                                     |
| ----------- | ------------------------------ | ------------------------------------------- |
| Unit        | Validate pure logic/components | Formatter, validator, mapper                |
| Integration | Validate layer integration     | Procedure + DB, form + API hook             |
| End-to-End  | Validate real user journey     | Login -> create incident -> verify timeline |

### Minimum Testing Expectations per Feature

- [ ] Unit tests for new business logic paths
- [ ] Integration test for API procedure success + error path
- [ ] UI test for loading/error/success rendering
- [ ] Regression test for fixed bug paths

### Practical Test Focus

- Test behavior, not implementation details.
- Include negative cases, not only happy paths.
- Keep tests deterministic and isolated.

---

## 8. 🚀 Performance & Scalability

### Frontend

- Memoize expensive computations where needed.
- Avoid unnecessary list re-renders (stable keys, split components).
- Paginate or virtualize long datasets.

### Backend/API

- Return only required fields.
- Batch requests or use optimized joins where appropriate.
- Enforce sensible pagination defaults.

### Caching Strategies

| Layer        | Strategy                               | Example                                 |
| ------------ | -------------------------------------- | --------------------------------------- |
| Client cache | Query key invalidation                 | Invalidate `incident.list` after create |
| Server cache | Short-lived cache for expensive reads  | Dashboard aggregates                    |
| CDN/edge     | Cache static and semi-static responses | Public metadata endpoints               |

### Scalability Guardrails

- [ ] No N+1 query patterns in critical paths
- [ ] Query plans/indexes reviewed for new heavy endpoints
- [ ] Rate limits and abuse protections considered

---

## 9. ⚠️ Common Mistakes to Avoid

1. Tight coupling between UI and DB models.
2. Over-fetching data “just in case”.
3. Inconsistent naming across layers.
4. Skipping server-side validation.
5. Missing authorization checks on write operations.
6. Ignoring loading/error/empty UI states.
7. Shipping without type-wide or integration verification.

> **Warning**
> A feature that works only on the happy path is not production-ready.

---

## 10. ✅ Feature Completion Checklist

Use this checklist before requesting merge:

### Code Quality

- [ ] Code is readable, scoped, and aligned to repo conventions
- [ ] No dead code, debug logs, or unused exports
- [ ] Naming is consistent across frontend/backend/shared layers

### Testing

- [ ] Unit and integration tests added/updated
- [ ] Critical user path verified locally
- [ ] Existing tests still pass

### UX and Product Behavior

- [ ] Loading, error, empty, and success states are implemented
- [ ] Accessibility basics are covered
- [ ] Copy and interaction patterns are consistent with existing product

### API and Validation

- [ ] Input validation enforced on backend
- [ ] Authorization checks implemented
- [ ] Contract changes documented and consumers updated

### Data and Operations

- [ ] DB changes reviewed for migration and rollback impact
- [ ] Observability/logging added for critical flows
- [ ] Performance impact considered for expected load

### Documentation and Collaboration

- [ ] PR includes context, screenshots (if UI), and test evidence
- [ ] Domain docs updated if behavior changed significantly
- [ ] Reviewer notes include known risks and follow-up items

---

## Quick Reference: End-to-End Build Sequence

```text
Ticket -> Design (contract + scope) -> Backend procedure -> DB updates
-> Frontend integration -> Tests -> Type checks -> PR -> Review -> Merge -> Deploy -> Monitor
```

Use this playbook as the default operating model for all new features and major enhancements.
