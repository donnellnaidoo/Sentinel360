# Phase 2: Core — Criminal Profiles & Cases

> **Sentinel360 Implementation Plan — Phase 2**
> **Version:** 1.0 | **Last Updated:** June 2026
> **Estimated Effort:** 4–5 weeks / 160–200 person-hours
> **Dependencies:** Phase 1 (Auth & RBAC)

---

## 1. Objective

Build the core investigative domain of Sentinel360: criminal profiles and cases (dockets). This phase enables law enforcement and admin users to create, manage, and search criminal profiles with biometric data, associate them with cases, track case timelines, and surface the public wanted feed. Every subsequent phase (evidence, sightings, AI) feeds into or references these two central entities.

**Corresponding Requirements:**
- **US-02** — View Wanted Feed (Public)
- **US-05** — View Full Wanted Feed (Security Company)
- **US-10** — View Wanted Feed (Law Enforcement)
- **US-13** — Update Criminal Status (Law Enforcement)
- **US-14** — Manage Criminal Profiles (Admin)
- **US-19** — Manage Criminal Profiles (Super Admin)
- **§5.2** — Automated Entity Attribute Extraction (biometrics, photos, vehicle data)

---

## 2. Key Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | **Database — Profiles & Cases schema** | Criminal profiles, biometrics, photos, aliases, known associates, locations, threat assessments; cases, case_criminals, case_evidence, case_timeline, case_activity_logs, case_notes |
| 2 | **Profile CRUD API** | Create, read, update, soft-delete, permanent-delete, merge profiles |
| 3 | **Case CRUD API** | Create, read, update, soft-delete cases; manage status workflow |
| 4 | **Profile sub-resource APIs** | Photos, biometrics, aliases, associates, locations, threat assessments |
| 5 | **Case sub-resource APIs** | Timeline, activity log, notes, linked criminals, linked evidence |
| 6 | **Public wanted feed API** | Unauthenticated endpoint for community wanted list |
| 7 | **Web: Profile management** | Profile list, detail view, create/edit forms, photo management, biometric viewer |
| 8 | **Web: Case management** | Case list/detail, docket page with timeline, case notes, linked evidence |
| 9 | **Web: Public wanted feed** | Public page showing wanted suspects (no auth required) |
| 10 | **Search & filtering** | Full-text search on profiles and cases; geospatial filtering |
| 11 | **Profile merging & dedup** | Super Admin merge workflow for duplicate profiles |

---

## 3. Database Tables

### 3.1 Schema Additions

| Table | Purpose | Dependencies |
|-------|---------|--------------|
| `criminal_profiles` | Central persons-of-interest table | `users` (created_by) |
| `profile_biometrics` | Face embeddings, fingerprint hashes, voice prints | `criminal_profiles` |
| `profile_photos` | Mugshots, surveillance photos, uploaded images | `criminal_profiles` |
| `profile_aliases` | Known aliases, nicknames, street names | `criminal_profiles` |
| `profile_known_associates` | Links between profiles (accomplices, gang members) | `criminal_profiles` |
| `profile_last_locations` | Chronological location history | `criminal_profiles` |
| `profile_threat_assessments` | Risk level assessments with valid time ranges | `criminal_profiles`, `users` |
| `cases` | Investigation case/docket records | `users` |
| `case_criminals` | Links cases to criminal profiles with roles | `cases`, `criminal_profiles` |
| `case_evidence` | Links cases to evidence records | `cases`, `evidence` |
| `case_timeline_entries` | Chronological case timeline | `cases` |
| `case_activity_logs` | Immutable case activity audit trail | `cases`, `users` |
| `case_notes` | Investigator notes (public/private) | `cases`, `users` |

### 3.2 Key Tables Detail

#### `criminal_profiles`
```sql
CREATE TABLE criminal_profiles (
    id                  TEXT PRIMARY KEY,
    external_id         VARCHAR(100) UNIQUE,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    date_of_birth       DATE,
    gender              VARCHAR(20),
    nationality         VARCHAR(100),
    id_number           VARCHAR(50),
    physical_description JSONB,
    risk_level          VARCHAR(20) DEFAULT 'unknown',
    status              VARCHAR(30) NOT NULL DEFAULT 'active',
    status_changed_at   TIMESTAMPTZ,
    status_changed_by   TEXT REFERENCES users(id),
    is_public           BOOLEAN NOT NULL DEFAULT TRUE,
    is_wanted           BOOLEAN NOT NULL DEFAULT TRUE,
    last_known_location GEOGRAPHY(Point, 4326),
    last_seen_at        TIMESTAMPTZ,
    default_confidence_threshold DECIMAL(5,2) DEFAULT 80.00,
    notes               TEXT,
    merged_into         TEXT REFERENCES criminal_profiles(id),
    created_by          TEXT REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);
```

#### `cases`
```sql
CREATE TABLE cases (
    id                  TEXT PRIMARY KEY,
    case_number         VARCHAR(50) NOT NULL UNIQUE,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    category            VARCHAR(100) NOT NULL,
    priority            VARCHAR(20) NOT NULL DEFAULT 'medium',
    status              VARCHAR(30) NOT NULL DEFAULT 'open',
    status_changed_at   TIMESTAMPTZ,
    status_changed_by   TEXT REFERENCES users(id),
    assigned_investigator TEXT REFERENCES users(id),
    assigned_team       TEXT[],
    jurisdiction        VARCHAR(200),
    incident_location   GEOGRAPHY(Point, 4326),
    incident_address    TEXT,
    incident_started_at TIMESTAMPTZ,
    incident_ended_at   TIMESTAMPTZ,
    reported_by         TEXT REFERENCES users(id),
    reported_at         TIMESTAMPTZ,
    is_sensitive        BOOLEAN NOT NULL DEFAULT FALSE,
    closure_notes       TEXT,
    closed_at           TIMESTAMPTZ,
    closed_by           TEXT REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);
```

#### `case_timeline_entries`
```sql
CREATE TABLE case_timeline_entries (
    id              TEXT PRIMARY KEY,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    event_type      VARCHAR(50) NOT NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL,
    source          VARCHAR(50),
    source_id       TEXT,
    created_by      TEXT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 Prisma Schema Updates

Add to `packages/db/prisma/schema.prisma`:
- `CriminalProfile`, `ProfileBiometric`, `ProfilePhoto`, `ProfileAlias`, `ProfileKnownAssociate`, `ProfileLastLocation`, `ProfileThreatAssessment`
- `Case`, `CaseCriminal`, `CaseEvidence`, `CaseTimelineEntry`, `CaseActivityLog`, `CaseNote`
- All relations with `cascade` deletes where appropriate
- `Geography` type handled via Prisma PostGIS extensions or raw SQL
- JSONB fields for `physicalDescription`, `assignedTeam`

---

## 4. API Endpoints

### 4.1 Criminal Profile Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/profiles` | List profiles (paginated, filterable) | security, law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/profiles` | Create criminal profile | admin, super_admin |
| `GET`    | `/api/v1/profiles/{id}` | Get profile details | security, law_enforcement, admin, super_admin |
| `PATCH`  | `/api/v1/profiles/{id}` | Update profile | admin, super_admin |
| `DELETE` | `/api/v1/profiles/{id}` | Soft-delete profile | admin, super_admin |
| `DELETE` | `/api/v1/profiles/{id}/permanent` | Permanent delete (with 2FA confirmation) | super_admin |
| `POST`   | `/api/v1/profiles/{id}/merge` | Merge duplicate profiles | super_admin |
| `PATCH`  | `/api/v1/profiles/{id}/status` | Update status (active/arrested/cleared) | law_enforcement, admin, super_admin |

### 4.2 Profile Sub-resources

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/profiles/{id}/photos` | List photos | security, law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/profiles/{id}/photos` | Add photo | admin, super_admin |
| `DELETE` | `/api/v1/profiles/{id}/photos/{photoId}` | Delete photo | admin, super_admin |
| `PATCH`  | `/api/v1/profiles/{id}/photos/{photoId}/primary` | Set primary photo | admin, super_admin |
| `GET`    | `/api/v1/profiles/{id}/biometrics` | List biometric data | law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/profiles/{id}/biometrics` | Add biometric data | admin, super_admin |
| `GET`    | `/api/v1/profiles/{id}/aliases` | List aliases | security, law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/profiles/{id}/aliases` | Add alias | admin, super_admin |
| `DELETE` | `/api/v1/profiles/{id}/aliases/{aliasId}` | Remove alias | admin, super_admin |
| `GET`    | `/api/v1/profiles/{id}/associates` | List known associates | law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/profiles/{id}/associates` | Add known associate | admin, super_admin |
| `DELETE` | `/api/v1/profiles/{id}/associates/{assocId}` | Remove association | admin, super_admin |
| `GET`    | `/api/v1/profiles/{id}/locations` | Location history | law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/profiles/{id}/locations` | Record last known location | law_enforcement, admin |
| `POST`   | `/api/v1/profiles/{id}/threat-assessment` | Create threat assessment | law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/profiles/{id}/threat-assessment` | Get current threat assessment | law_enforcement, admin, super_admin |

### 4.3 Public Wanted Feed

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/profiles/public` | Public wanted feed (paginated) | Public (no auth) |

### 4.4 Case Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/cases` | List cases (paginated, filterable) | security, law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/cases` | Create case | law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/cases/{id}` | Get case details with relations | security (assigned), law_enforcement, admin, super_admin |
| `PATCH`  | `/api/v1/cases/{id}` | Update case | law_enforcement (assigned), admin, super_admin |
| `DELETE` | `/api/v1/cases/{id}` | Soft-delete case | super_admin |
| `PATCH`  | `/api/v1/cases/{id}/status` | Update case status | law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/cases/{id}/timeline` | Get case timeline | security, law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/cases/{id}/timeline` | Add timeline entry | law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/cases/{id}/activity` | Get case activity log | security, law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/cases/{id}/notes` | List case notes | security (own), law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/cases/{id}/notes` | Add case note | security, law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/cases/{id}/criminals` | List linked criminals | security, law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/cases/{id}/criminals` | Link criminal to case | law_enforcement, admin, super_admin |
| `DELETE` | `/api/v1/cases/{id}/criminals/{criminalId}` | Remove criminal from case | law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/cases/{id}/evidence` | List linked evidence | security, law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/cases/{id}/evidence` | Link evidence to case | law_enforcement, admin, super_admin |
| `DELETE` | `/api/v1/cases/{id}/evidence/{evidenceId}` | Remove evidence from case | law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/cases/stats` | Case statistics | law_enforcement, admin, super_admin |

---

## 5. Frontend Components (Web — Next.js)

### 5.1 Route Structure

| Route | Component | Description | Auth |
|-------|-----------|-------------|------|
| `/wanted` | `PublicWantedFeedPage` | Public wanted list (no auth) | Public |
| `/profiles` | `ProfileListPage` | Paginated profile list with filters | security+ |
| `/profiles/new` | `ProfileCreatePage` | Create criminal profile form | admin+ |
| `/profiles/{id}` | `ProfileDetailPage` | Full profile with photos, aliases, cases | security+ |
| `/profiles/{id}/edit` | `ProfileEditPage` | Edit profile details | admin+ |
| `/profiles/{id}/merge` | `ProfileMergePage` | Merge with duplicate profile | super_admin |
| `/cases` | `CaseListPage` | Paginated case list with filters | security+ |
| `/cases/new` | `CaseCreatePage` | Create new case/docket | law_enforcement+ |
| `/cases/{id}` | `CaseDetailPage` | Full case detail (docket page) | security+ |
| `/cases/{id}/edit` | `CaseEditPage` | Edit case details | law_enforcement+ |

### 5.2 Key Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `WantedFeedGrid` | Card grid of wanted persons (photo, name, location) | PublicWantedFeedPage |
| `WantedFeedCard` | Individual wanted person card | WantedFeedGrid |
| `ProfileTable` | Sortable, filterable table with status badges | ProfileListPage |
| `ProfileForm` | Multi-section form (details, physical description, risk) | ProfileCreatePage, ProfileEditPage |
| `ProfileHeader` | Profile summary with photo, name, status, risk level | ProfileDetailPage |
| `PhotoGallery` | Grid of profile photos with upload/delete | ProfileDetailPage |
| `PhotoUploader` | Drag-and-drop photo upload with preview | PhotoGallery |
| `BiometricViewer` | Display of stored biometric embeddings | ProfileDetailPage |
| `AliasesList` | Inline list with add/remove | ProfileDetailPage |
| `AssociatesGraph` | Network graph of known associates (or list view) | ProfileDetailPage |
| `LocationTimeline` | Map with chronological location pins | ProfileDetailPage |
| `ThreatAssessmentForm` | Risk level selection with notes | ProfileDetailPage |
| `CaseTable` | Sortable, filterable case list | CaseListPage |
| `CaseForm` | Create/edit case with all fields | CaseCreatePage, CaseEditPage |
| `CaseHeader` | Case number, status, priority, assigned investigator | CaseDetailPage |
| `DocketTimeline` | Vertical timeline of case events | CaseDetailPage |
| `TimelineEntryForm` | Add timeline event (type, date, description) | CaseDetailPage |
| `CaseNotesPanel` | Notes list with add, public/private toggle | CaseDetailPage |
| `CriminalLinkPanel` | Linked criminals with role, add/remove | CaseDetailPage |
| `CaseActivityLog` | Immutable activity feed | CaseDetailPage |
| `StatusBadge` | Coloured status indicator (reusable) | Multiple |
| `PriorityBadge` | Priority level indicator | Multiple |
| `MergeWizard` | Step-by-step profile merge flow | ProfileMergePage |

### 5.3 Docket Page Detail

The case detail (docket) page is the central investigative workspace. It must include:

- **Header**: Case number, title, status badge, priority, assigned investigator
- **Tabs or sections**:
  1. **Overview**: Description, incident location (map), date range, jurisdiction
  2. **Timeline**: Chronological event list with filtering by event type
  3. **Criminals**: Linked profiles with role (suspect, POI, arrested, victim)
  4. **Evidence**: Linked evidence items (cards/grid with type, status, confidence)
  5. **Notes**: Investigator notes (public/private toggle)
  6. **Activity Log**: Immutable audit of all case changes

---

## 6. Mobile Screens (Expo)

### 6.1 Screen Structure

| Screen | Route | Description | Auth |
|--------|-------|-------------|------|
| `WantedFeedScreen` | `/wanted` | Public wanted feed (native) | Public |
| `ProfileDetailScreen` | `/profiles/{id}` | Read-only profile view | Security+ |
| `ProfileListScreen` | `/profiles` | Profile search and list (tablets) | Security+ |

### 6.2 Shared Mobile Components

| Component | Description |
|-----------|-------------|
| `WantedCard` | Card with photo, name, location for feed |
| `ProfileDetailView` | Full profile read-only view |
| `StatusChip` | Coloured status indicator chip |

---

## 7. Testing Focus

### 7.1 Unit Tests

| Area | Tests | Coverage |
|------|-------|----------|
| **Profile service** | CRUD, status transitions, soft delete, merge logic | 90%+ |
| **Case service** | CRUD, status workflow, timeline management | 90%+ |
| **Case number generation** | Sequential format `S360-2026-NNNNN` | 100% |
| **Profile merging** | Duplicate detection, field-level merge resolution | 95%+ |
| **Validation schemas** | All profile and case input schemas | 100% |

### 7.2 Integration Tests

| Test | Description |
|------|-------------|
| Profile CRUD flow | Create → read → update → list → soft delete |
| Case CRUD flow | Create → assign investigator → add timeline → update status |
| Profile → Case linking | Create profile, create case, link, verify association |
| Public feed access | Unauthenticated access returns wanted profiles only |
| Status transitions | Active → Arrested → Cleared; verify audit trail |
| Profile merge | Merge two profiles, verify redirect and data consolidation |
| Search & filter | Full-text search on names, filter by status/risk/region |

### 7.3 E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| `public-wanted-feed.spec.ts` | Visit public feed, verify data loads, pagination works |
| `profile-crud.spec.ts` | Admin creates, edits, archives a profile |
| `case-crud.spec.ts` | Law enforcement creates case, adds timeline, changes status |
| `profile-photo-upload.spec.ts` | Upload photo, set primary, delete photo |
| `case-timeline.spec.ts` | Add timeline entries, verify chronological order |
| `profile-merge.spec.ts` | Super Admin merges two profiles |
| `docket-page.spec.ts` | Full docket page with all sections loading correctly |
| `search-filtering.spec.ts` | Search profiles and cases, verify filter results |

---

## 8. Estimated Effort Breakdown

| Task | Hours | Assigned To |
|------|-------|-------------|
| **Database — Profiles schema** (Prisma models, migration) | 10 | Backend Dev |
| **Database — Cases schema** (Prisma models, migration) | 8 | Backend Dev |
| **Profile CRUD service** (create, read, update, delete, list) | 16 | Full Stack Dev |
| **Case CRUD service** (create, read, update, delete, list, search) | 16 | Full Stack Dev |
| **Profile sub-resource services** (photos, biometrics, aliases, associates, locations, threat) | 20 | Backend Dev |
| **Case sub-resource services** (timeline, notes, activity, linking) | 16 | Full Stack Dev |
| **Public wanted feed endpoint** | 6 | Backend Dev |
| **Search & filtering** (Elasticsearch sync, full-text search service) | 12 | Backend Dev |
| **Web: Profile list & detail pages** | 16 | Frontend Dev |
| **Web: Profile create/edit forms** | 14 | Frontend Dev |
| **Web: Case list & detail (docket) page** | 20 | Frontend Dev |
| **Web: Case create/edit forms** | 12 | Frontend Dev |
| **Web: Public wanted feed page** | 8 | Frontend Dev |
| **Web: Photo gallery & uploader** | 8 | Frontend Dev |
| **Web: Profile merge wizard** | 6 | Frontend Dev |
| **Mobile: Wanted feed screen** | 8 | Frontend Dev |
| **Mobile: Profile detail screen** | 6 | Frontend Dev |
| **Tests** (unit, integration, E2E) | 20 | All |
| **Documentation** | 4 | PM / BA |
| **Total** | **226** | |

---

## 9. Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Profile data model changes in later phases (AI adds fields) | Rework | Design profiles extensibly with JSONB for AI metadata; avoid rigid columns |
| Case number format changes | Migration overhead | Use parameterised format string in config; not hardcoded |
| Large profile photo uploads | Slow page loads | Implement image compression (Sharp) and CDN delivery from Phase 1 infra |
| Elasticsearch sync lag | Stale search results | Implement real-time sync via DB triggers or queue; document eventual consistency |
| Profile data privacy (public vs. internal) | Data leaks | Strict `is_public` filtering; RBAC on all internal endpoints |

---

## 10. Definition of Done

- [ ] All profile and case tables created, migrated, and seeded with test data
- [ ] Full CRUD for criminal profiles (including sub-resources)
- [ ] Full CRUD for cases (including timeline, notes, evidence linking)
- [ ] Public wanted feed accessible without authentication
- [ ] Status workflow enforced (profile: active → arrested → cleared; case: open → under_investigation → closed)
- [ ] Profile merging working with audit trail
- [ ] All RBAC rules enforced on profile and case endpoints
- [ ] Web profile management pages functional (list, detail, create, edit)
- [ ] Web case management (docket) page fully functional
- [ ] Web public wanted feed renders correctly
- [ ] Unit + integration test coverage > 85%
- [ ] E2E tests passing for all critical profile and case flows
- [ ] Elasticsearch search indexing operational
