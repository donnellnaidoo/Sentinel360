# Phase 3: Intelligence — Evidence & Sightings

> **Sentinel360 Implementation Plan — Phase 3**
> **Version:** 1.0 | **Last Updated:** June 2026
> **Estimated Effort:** 4–5 weeks / 160–200 person-hours
> **Dependencies:** Phase 1 (Auth & RBAC), Phase 2 (Profiles & Cases)

---

## 1. Objective

Implement the evidence management and community sighting submission domains. This phase enables secure evidence upload with cryptographic chain-of-custody integrity, community-submitted sighting reports with AI matching workflow, and verification pipelines for law enforcement. Evidence becomes the forensic backbone of all case investigations, while sightings provide a critical community-to-law-enforcement intelligence channel.

**Corresponding Requirements:**
- **US-03** — Submit a Sighting (Community Member)
- **US-06** — Submit CCTV Snapshots (Security Company)
- **US-11** — Verify Snapshots (Law Enforcement)
- **US-12** — Verify Sightings (Law Enforcement)
- **US-16** — Verify Snapshots (Admin)
- **§5.2** — Automated Entity Attribute Extraction (evidence linking)
- **§6.3** — Forensic Chain of Custody and Cryptographic Hashing
- **§5.5** — Structured Incident Reporting & Metadata Integration

---

## 2. Key Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | **Database — Evidence & Sightings schema** | Evidence, chain_of_custody, evidence_tags, sightings, sighting_media, sighting_verifications |
| 2 | **Evidence upload service** | Secure file upload to S3/MinIO with SHA-256 hashing, thumbnail generation |
| 3 | **Chain of custody service** | Immutable cryptographic chain for all evidence access/modification events |
| 4 | **Evidence verification workflow** | Admin/LEO verification, rejection, re-analysis pipeline |
| 5 | **Sighting submission service** | Community sighting reports with photo, GPS location, description |
| 6 | **AI matching queue** | Sighting → profile matching via AI service (queue-based) |
| 7 | **Sighting verification workflow** | Law enforcement verification/rejection with decision tracking |
| 8 | **Pre-signed download URLs** | Secure time-limited evidence access |
| 9 | **Evidence gallery (web)** | Searchable, filterable evidence grid with type, status, confidence |
| 10 | **Sighting management (web)** | Sighting list, detail, verification interface |
| 11 | **Chain of custody viewer (web)** | Visual chain showing every access/transfer event |
| 12 | **Mobile: Report Sighting screen** | Camera, gallery, GPS location, media upload |
| 13 | **Mobile: My Sightings list** | Community user's submitted sightings with status |

---

## 3. Database Tables

### 3.1 Schema Additions

| Table | Purpose | Dependencies |
|-------|---------|--------------|
| `evidence` | Core evidence records with cryptographic hashes | `users`, `ai_model_versions` (optional FK) |
| `evidence_chain_of_custody` | Immutable chain of custody events | `evidence`, `users` |
| `evidence_tags` | Tag-based evidence classification | `evidence` |
| `sightings` | Community-submitted sighting reports | `users`, `criminal_profiles` (optional FK) |
| `sighting_media` | Photos/videos attached to sightings | `sightings` |
| `sighting_verifications` | Law enforcement verification decisions | `sightings`, `users` |

### 3.2 Key Tables Detail

#### `evidence`
```sql
CREATE TABLE evidence (
    id                  TEXT PRIMARY KEY,
    evidence_type       VARCHAR(50) NOT NULL,   -- snapshot, video_clip, witness_statement, document, alpr_record, 3d_reconstruction
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    
    -- File metadata
    s3_key              VARCHAR(512),
    cdn_url             VARCHAR(512),
    file_size_bytes     BIGINT,
    mime_type           VARCHAR(100),
    width               INTEGER,
    height              INTEGER,
    duration_seconds    DECIMAL(10,2),
    thumbnail_s3_key    VARCHAR(512),
    
    -- Cryptographic integrity
    sha256_hash         VARCHAR(64) NOT NULL,
    chain_position      INTEGER NOT NULL DEFAULT 1,
    
    -- Source
    source              VARCHAR(50) NOT NULL,   -- ai_capture, upload, system_generated, sighting
    source_id           TEXT,
    captured_at         TIMESTAMPTZ,
    captured_by_device  VARCHAR(200),
    
    -- Geolocation
    location            GEOGRAPHY(Point, 4326),
    location_address    TEXT,
    
    -- Status
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending, verified, rejected, archived
    verified_by         TEXT REFERENCES users(id),
    verified_at         TIMESTAMPTZ,
    verification_notes  TEXT,
    
    -- AI metadata
    ai_confidence_score DECIMAL(5,2),
    ai_model_version_id TEXT REFERENCES ai_model_versions(id),
    
    -- Audit
    created_by          TEXT REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);
```

#### `evidence_chain_of_custody`
```sql
CREATE TABLE evidence_chain_of_custody (
    id              TEXT PRIMARY KEY,
    evidence_id     TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    action          VARCHAR(50) NOT NULL,   -- created, accessed, viewed, exported, verified, archived
    performed_by    TEXT NOT NULL REFERENCES users(id),
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address      INET,
    user_agent      TEXT,
    previous_hash   VARCHAR(64),
    current_hash    VARCHAR(64) NOT NULL,
    notes           TEXT,
    metadata        JSONB
);
```

#### `sightings`
```sql
CREATE TABLE sightings (
    id                  TEXT PRIMARY KEY,
    profile_id          TEXT REFERENCES criminal_profiles(id),
    submitted_by        TEXT NOT NULL REFERENCES users(id),
    anonymous_submission BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Content
    description         TEXT NOT NULL,
    location            GEOGRAPHY(Point, 4326) NOT NULL,
    location_address    TEXT,
    location_accuracy_meters DECIMAL(10,2),
    observed_at         TIMESTAMPTZ NOT NULL,
    
    -- Status
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    status_changed_at   TIMESTAMPTZ,
    status_changed_by   TEXT REFERENCES users(id),
    
    -- AI Matching
    ai_match_processed  BOOLEAN NOT NULL DEFAULT FALSE,
    ai_match_profile_id TEXT REFERENCES criminal_profiles(id),
    ai_confidence_score DECIMAL(5,2),
    ai_model_version_id TEXT REFERENCES ai_model_versions(id),
    ai_processed_at     TIMESTAMPTZ,
    
    -- Verification
    verified_by         TEXT REFERENCES users(id),
    verified_at         TIMESTAMPTZ,
    verification_notes  TEXT,
    
    -- Reference
    reference_number    VARCHAR(30) NOT NULL UNIQUE,
    is_public           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);
```

#### `sighting_verifications`
```sql
CREATE TABLE sighting_verifications (
    id              TEXT PRIMARY KEY,
    sighting_id     TEXT NOT NULL REFERENCES sightings(id) ON DELETE CASCADE,
    verified_by     TEXT NOT NULL REFERENCES users(id),
    decision        VARCHAR(30) NOT NULL,   -- verified, duplicate, false_report
    confidence      DECIMAL(5,2),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sighting_id, verified_by)
);
```

### 3.3 Prisma Schema Updates

Add to `packages/db/prisma/schema.prisma`:
- `Evidence`, `EvidenceChainOfCustody`, `EvidenceTag`
- `Sighting`, `SightingMedium`, `SightingVerification`
- Self-referencing hash chain constraint on `EvidenceChainOfCustody`
- All file-related fields with appropriate defaults

---

## 4. API Endpoints

### 4.1 Evidence Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/evidence` | List evidence (paginated, filterable) | security, law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/evidence` | Upload new evidence (multipart) | security, law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/evidence/{id}` | Get evidence details | security, law_enforcement, admin, super_admin |
| `PATCH`  | `/api/v1/evidence/{id}` | Update evidence metadata | admin, super_admin |
| `DELETE` | `/api/v1/evidence/{id}` | Soft-delete evidence | super_admin |
| `GET`    | `/api/v1/evidence/{id}/download` | Get pre-signed download URL | security (verified), law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/evidence/{id}/stream` | Stream video evidence | security (verified), law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/evidence/{id}/chain-of-custody` | Get chain of custody records | law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/evidence/{id}/verify` | Verify evidence | admin, law_enforcement |
| `POST`   | `/api/v1/evidence/{id}/reject` | Reject evidence | admin, law_enforcement |
| `GET`    | `/api/v1/evidence/{id}/hash` | Get cryptographic hash verification | law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/evidence/batch/verify` | Batch verify evidence | admin, super_admin |

### 4.2 Evidence Tags

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`   | `/api/v1/evidence/{id}/tags` | List evidence tags | security, law_enforcement, admin, super_admin |
| `POST`  | `/api/v1/evidence/{id}/tags` | Add tag | admin, super_admin |
| `DELETE`| `/api/v1/evidence/{id}/tags/{tag}` | Remove tag | admin, super_admin |

### 4.3 Sighting Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `POST`   | `/api/v1/sightings` | Submit a sighting (multipart: description, location, photos) | community, security |
| `GET`    | `/api/v1/sightings` | List sightings (paginated, filterable) | law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/sightings/{id}` | Get sighting details | community (own), law_enforcement, admin, super_admin |
| `PATCH`  | `/api/v1/sightings/{id}/status` | Update sighting status | law_enforcement, admin, super_admin |
| `POST`   | `/api/v1/sightings/{id}/verify` | Verify/duplicate/false-report decision | law_enforcement, admin |
| `GET`    | `/api/v1/sightings/{id}/media` | Get sighting media files | community (own), law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/sightings/{id}/media/{mediaId}/download` | Download sighting media | law_enforcement, admin, super_admin |
| `GET`    | `/api/v1/sightings/my` | Get current user's sightings | community, security |
| `POST`   | `/api/v1/sightings/{id}/reprocess-ai` | Re-queue for AI matching | admin, super_admin |

---

## 5. Frontend Components (Web — Next.js)

### 5.1 Route Structure

| Route | Component | Description | Auth |
|-------|-----------|-------------|------|
| `/evidence` | `EvidenceListPage` | Searchable, filterable evidence gallery | security+ |
| `/evidence/{id}` | `EvidenceDetailPage` | Evidence detail with chain of custody | security+ |
| `/evidence/upload` | `EvidenceUploadPage` | Upload new evidence (multi-file) | security+ |
| `/evidence/{id}/chain-of-custody` | `ChainOfCustodyPage` | Visual chain of custody timeline | law_enforcement+ |
| `/sightings` | `SightingListPage` | Sighting management list | law_enforcement+ |
| `/sightings/{id}` | `SightingDetailPage` | Sighting detail with verification | law_enforcement+ |
| `/sightings/review` | `SightingReviewQueuePage` | Queue of pending sighting verifications | law_enforcement+ |
| `/my-sightings` | `MySightingsPage` | Community user's submitted sightings | community, security |
| `/admin/evidence` | `AdminEvidenceQueuePage` | Evidence verification queue | admin+ |

### 5.2 Key Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `EvidenceGallery` | Grid/card view of evidence items with filters | EvidenceListPage |
| `EvidenceCard` | Thumbnail card with type, status, confidence badge | EvidenceGallery |
| `EvidenceDetail` | Full evidence view with metadata, hash, preview | EvidenceDetailPage |
| `EvidenceUploader` | Multi-file upload with progress, drag-and-drop | EvidenceUploadPage |
| `ChainOfCustodyTimeline` | Visual chain showing every access event | ChainOfCustodyPage |
| `ChainOfCustodyNode` | Individual event node in the chain | ChainOfCustodyTimeline |
| `HashVerificationPanel` | SHA-256 hash display with copy/verify button | EvidenceDetailPage |
| `EvidencePreview` | Image viewer, video player, document preview | EvidenceDetailPage |
| `SightingTable` | Filterable list of sightings (status, date, location) | SightingListPage |
| `SightingDetail` | Full sighting with photos, map, AI match results | SightingDetailPage |
| `SightingVerificationForm` | Verify/duplicate/false-report decision form | SightingDetailPage, SightingReviewQueuePage |
| `SightingMap` | Map showing sighting location with context | SightingDetailPage |
| `SightingMediaCarousel` | Photo/video gallery within sighting | SightingDetailPage |
| `MySightingCard` | User's sighting with status badge | MySightingsPage |
| `PendingVerificationBadge` | Badge showing count of pending items | SightingReviewQueuePage |
| `ReferenceNumberBadge` | Display sighting/evidence ref number | Multiple |

### 5.3 Evidence Detail Page Layout

```
+--------------------------------------------------+
| Evidence Detail                                   |
| [type badge] [status badge] [confidence badge]    |
+--------------------------------------------------+
|                                                    |
|  [Large preview: image/video/document]            |
|                                                    |
+--------------------------------------------------+
| Metadata:                                         |
|  • Title, Description, Source                     |
|  • Captured at, Camera/Device                     |
|  • File size, dimensions, duration               |
|  • Location (mini-map)                           |
|  • SHA-256: a1b2c3d4... [Copy] [Verify]          |
+--------------------------------------------------+
| Verdict:                                          |
|  [Approve] [Reject] [Request Re-analysis]         |
+--------------------------------------------------+
| Chain of Custody (18 events)                      |
|  ┌──────────────────────────────────────────┐     |
|  │ 2026-06-13 14:30  Created  by Off. Mokoena│    |
|  │ 2026-06-13 15:45  Viewed  by Det. Smith   │    |
|  │ 2026-06-14 09:00  Verified by Admin        │    |
|  └──────────────────────────────────────────┘     |
|  [View full chain →]                               |
+--------------------------------------------------+
```

---

## 6. Mobile Screens (Expo)

### 6.1 Screen Structure

| Screen | Route | Description | Auth |
|--------|-------|-------------|------|
| `ReportSightingScreen` | `/sightings/report` | Camera/gallery capture, description, GPS, submit | community, security |
| `MySightingsScreen` | `/sightings/my` | List of user's submitted sightings | community, security |
| `SightingDetailScreen` | `/sightings/{id}` | Read-only sighting status and details | community (own) |
| `EvidenceListScreen` | `/evidence` | Evidence list for field access | security+ |
| `EvidenceDetailScreen` | `/evidence/{id}` | Evidence details and download | security+ |

### 6.2 Key Mobile Components

| Component | Description |
|-----------|-------------|
| `CameraCapture` | Camera view with capture button, flash toggle |
| `GalleryPicker` | Multi-image selector from device gallery |
| `LocationPicker` | Map with current location and manual pin adjustment |
| `SightingForm` | Description text area, anonymous toggle, submit |
| `SightingStatusCard` | Status card with reference number for confirmation |
| `EvidenceThumbnail` | Small evidence preview card |
| `MediaPreviewCarousel` | Swipeable photo/video preview |

### 6.3 Report Sighting Flow

```
1. [Camera/Gallery] → 
2. [Add Description] →
3. [Confirm Location] (GPS auto-fill, adjust on map) →
4. [Review & Submit] →
5. [Confirmation Screen] (reference number, "We'll notify you")
```

---

## 7. Testing Focus

### 7.1 Unit Tests

| Area | Tests | Coverage |
|------|-------|----------|
| **Evidence service** | Upload, hash computation, hash verification, status transitions | 90%+ |
| **Chain of custody** | Record creation, hash chain integrity, linked-list verification | 95%+ |
| **Sighting submission** | Validation, media upload, AI queue enqueue | 90%+ |
| **Sighting verification** | Decision recording, status update, notification trigger | 90%+ |
| **File validation** | MIME type checking, size limits, virus scan integration | 95%+ |
| **Pre-signed URL generation** | Expiry enforcement, permission checks | 100% |

### 7.2 Integration Tests

| Test | Description |
|------|-------------|
| Evidence upload flow | Upload → hash computed → chain of custody created → status = pending |
| Evidence verification flow | Verify evidence → chain event recorded → status = verified |
| Evidence download flow | Request download → pre-signed URL returned → URL valid for 15 min |
| Chain of custody integrity | Verify linked-list hash chain cannot be tampered with |
| Sighting submission flow | Submit sighting → media uploaded → AI match queued → reference returned |
| Sighting verification flow | Verify → duplicate → false report; check status transitions |
| Sighting AI match update | AI service completes → profile linked → confidence scored |
| Evidence → Case linking | Link evidence to case (from Phase 2) → verify case has evidence |

### 7.3 E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| `evidence-upload.spec.ts` | Upload image/video evidence via web form |
| `evidence-gallery.spec.ts` | Browse, filter, search evidence gallery |
| `chain-of-custody-view.spec.ts` | View chain of custody for an evidence item |
| `evidence-verify.spec.ts` | Admin approves evidence |
| `sighting-list.spec.ts` | LEO views sighting list with filters |
| `sighting-verify.spec.ts` | LEO verifies a community sighting |
| `evidence-case-linking.spec.ts` | Link evidence to case from evidence detail |

### 7.4 E2E Tests (Detox — Mobile)

| Test | Description |
|------|-------------|
| `report-sighting.spec.ts` | Capture photo, add description, confirm location, submit |
| `my-sightings.spec.ts` | View submitted sightings list, check status |
| `sighting-confirmation.spec.ts` | Verify reference number appears after submission |

---

## 8. Estimated Effort Breakdown

| Task | Hours | Assigned To |
|------|-------|-------------|
| **Database — Evidence schema** (Prisma models, migration) | 8 | Backend Dev |
| **Database — Sightings schema** (Prisma models, migration) | 6 | Backend Dev |
| **Evidence upload service** (multipart handling, S3/MinIO, thumbnails, SHA-256) | 20 | Full Stack Dev |
| **Chain of custody service** (hash chain logic, event recording, verification) | 14 | Backend Dev |
| **Evidence CRUD + verification workflow** | 12 | Backend Dev |
| **Sighting submission service** (media, GPS, AI queue) | 14 | Full Stack Dev |
| **Sighting verification workflow** (status, decisions, notifications) | 10 | Backend Dev |
| **Pre-signed URL service** (time-limited access, permission checks) | 6 | Backend Dev |
| **Web: Evidence gallery & detail page** | 16 | Frontend Dev |
| **Web: Evidence upload page** | 10 | Frontend Dev |
| **Web: Chain of custody viewer** | 10 | Frontend Dev |
| **Web: Sighting list & detail page** | 12 | Frontend Dev |
| **Web: Sighting review queue** | 8 | Frontend Dev |
| **Web: My Sightings page** | 6 | Frontend Dev |
| **Web: Admin evidence queue** | 6 | Frontend Dev |
| **Mobile: Report Sighting screen** (camera, gallery, GPS, form) | 20 | Frontend Dev |
| **Mobile: My Sightings screen** | 8 | Frontend Dev |
| **Mobile: Evidence list/detail screens** | 10 | Frontend Dev |
| **Tests** (unit, integration, E2E) | 20 | All |
| **Documentation** | 4 | PM / BA |
| **Total** | **220** | |

---

## 9. Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| S3/MinIO configuration issues in dev | Blocked evidence upload | Containerise MinIO with dev compose; mock S3 in unit tests |
| Large video uploads timeout | Poor UX | Implement chunked upload; background queue for transcoding |
| SHA-256 hash integrity bugs | Legal chain of custody compromised | Extensive property-based testing on hash chain validation; second-opinion check |
| AI service not ready for sighting matching | Sightings remain unmatched | Separate AI matching phase; sightings store AI metadata fields for later processing |
| Mobile camera/GPS permission issues | Blocked sighting submission | Graceful fallback: gallery-only mode, manual location entry |

---

## 10. Definition of Done

- [ ] All evidence and sighting tables created and migrated
- [ ] Evidence upload working with SHA-256 hashing and S3/MinIO storage
- [ ] Chain of custody records created for every evidence action
- [ ] Chain of custody hash integrity verifiable via API
- [ ] Evidence verification workflow operational (pending → verified/rejected)
- [ ] Pre-signed download URLs working with 15-min expiry
- [ ] Sighting submission creates record with media, location, and AI queue entry
- [ ] Sighting verification flow (pending → verified/duplicate/false_report)
- [ ] Evidence can be linked to cases (Phase 2 integration)
- [ ] Web evidence gallery, upload, detail, chain-of-custody pages fully functional
- [ ] Web sighting management and review pages fully functional
- [ ] Mobile sighting submission flow working on iOS and Android
- [ ] Unit + integration test coverage > 85%
- [ ] E2E tests passing for all critical evidence and sighting flows
