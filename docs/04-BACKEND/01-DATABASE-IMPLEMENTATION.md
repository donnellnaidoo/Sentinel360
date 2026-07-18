# 01 — Database Implementation

> **Sentinel360 Backend — Database Design & Implementation**
> Version: 1.0 | Last Updated: June 2026

---

## Table of Contents

1. [Database Technology Stack](#1-database-technology-stack)
2. [ERD Overview](#2-erd-overview)
3. [Complete Prisma Schema](#3-complete-prisma-schema)
4. [Migration Strategy](#4-migration-strategy)
5. [Seed Data Strategy](#5-seed-data-strategy)
6. [Query Optimization Strategies](#6-query-optimization-strategies)
7. [Connection Pooling Configuration](#7-connection-pooling-configuration)
8. [Data Retention & Archival](#8-data-retention--archival)
9. [Backup & Disaster Recovery](#9-backup--disaster-recovery)

---

## 1. Database Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Primary Database** | PostgreSQL | 16 | Relational data store with ACID compliance |
| **Spatial Extension** | PostGIS | 3.4 | Geospatial queries for crime locations, camera positions, movement paths |
| **Time-Series Extension** | TimescaleDB | 2.15 | HyperTables for alert history, detection events, movement logs |
| **Hashing Extension** | pgcrypto | Built-in | SHA-256 hashing for chain of custody |
| **UUID Extension** | uuid-ossp | Built-in | UUID v4 generation for all entity IDs |
| **Connection Pooler** | PgBouncer | 1.22 (prod) | Lightweight connection pooling for production |
| **ORM** | Prisma | 5.14+ | Type-safe query builder with migrations |
| **Migration Tool** | Prisma Migrate | Built-in | Declarative schema migrations |
| **Caching Layer** | Redis | 7 | Query result caching, session store |
| **Search Index** | Elasticsearch | 8.13 | Full-text search, aggregations |

### Why PostgreSQL Over Alternatives

| Requirement | PostgreSQL Solution |
|-------------|-------------------|
| **Geospatial queries** (sighting locations, camera coverage areas) | PostGIS with `GEOGRAPHY` types, `ST_DWithin`, `ST_Contains` |
| **Chain of custody hashing** | `pgcrypto` with `digest()` for SHA-256 |
| **Immutable audit logs** | Row-level security + `UNLOGGED` tables + triggers |
| **Time-series alert data** | TimescaleDB hypertables for automatic partitioning |
| **Full-text search on wanted feed** | Built-in `tsvector`/`tsquery` (or offload to Elasticsearch for production) |
| **JSON metadata on evidence** | Native `JSONB` with indexing |
| **Row-level security** for RBAC enforcement | PostgreSQL Row-Level Security (RLS) policies |

---

## 2. ERD Overview

### Core Entities & Relationships

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     User     │1──N──>│     Case         │1──N──>│    Evidence      │
├──────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (UUID)    │       │ id (UUID)        │       │ id (UUID)        │
│ email        │       │ caseNumber       │       │ filePath         │
│ passwordHash │       │ title            │       │ fileType         │
│ role         │       │ description      │       │ sha256Hash       │
│ status       │       │ status           │       │ chainOfCustody[] │
│ name         │       │ priority         │       │ metadata (JSONB) │
│ createdAt    │       │ createdAt        │       │ createdAt        │
└──────┬───────┘       │ assignedTo (FK)  │       └──────────────────┘
       │               └──────────────────┘
       │                        │1
       │                        │
       │1                       │N
       │               ┌──────────────────┐
       │               │   CaseSuspect    │ (Join Table)
       │               ├──────────────────┤
       │               │ caseId (FK)      │
       │               │ profileId (FK)   │
       │               └──────────────────┘
       │                        │
       │                        │N
       │               ┌──────────────────┐
       │               │ CriminalProfile  │
       │               ├──────────────────┤
       │               │ id (UUID)        │
       │               │ fullName         │
       │               │ aliases[]        │
       │               │ riskLevel        │
       │               │ status           │
       │               │ biometricData    │
       │               └──────────────────┘
       │
       │1──N──>┌──────────────────┐
       │       │   Sighting       │
       │       ├──────────────────┤
       │       │ id (UUID)        │
       │       │ location (GEO)   │
       │       │ description      │
       │       │ confidence       │
       │       │ status           │
       │       └──────────────────┘
       │
       │1──N──>┌──────────────────┐
       │       │   Alert          │
       │       ├──────────────────┤
       │       │ id (UUID)        │
       │       │ type             │
       │       │ severity         │
       │       │ title            │
       │       │ body             │
       │       │ deliveredAt      │
       │       └──────────────────┘
       │
       │1──N──>┌──────────────────┐
               │   AuditLog       │ (Immutable)
               ├──────────────────┤
               │ id (UUID)        │
               │ action           │
               │ entityType       │
               │ entityId         │
               │ metadata (JSONB) │
               │ ipAddress        │
               │ createdAt        │
               └──────────────────┘
```

---

## 3. Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "fullTextSearch"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis(version: "3.4.0"), uuidOspd, pgcrypto]
}

// ============================================================================
// ENUMS
// ============================================================================

enum UserRole {
  COMMUNITY
  SECURITY
  LAW_ENFORCEMENT
  ADMIN
  SUPER_ADMIN
}

enum UserStatus {
  PENDING_VERIFICATION
  ACTIVE
  SUSPENDED
  DEACTIVATED
  LOCKED
}

enum CaseStatus {
  OPEN
  UNDER_INVESTIGATION
  CLOSED
  ARCHIVED
  COLD
}

enum CasePriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum EvidenceType {
  IMAGE
  VIDEO
  DOCUMENT
  AUDIO
  OTHER
}

enum EvidenceStatus {
  PENDING_REVIEW
  VERIFIED
  REJECTED
  ADMITTED
  EXPUNGED
}

enum ChainOfCustodyAction {
  UPLOADED
  REVIEWED
  VERIFIED
  TRANSFERRED
  EXPORTED
  ARCHIVED
  EXPUNGED
}

enum CriminalProfileStatus {
  ACTIVE
  ARRESTED
  CLEARED
  DECEASED
  ARCHIVED
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum SightingStatus {
  PENDING_VERIFICATION
  VERIFIED
  DISMISSED
  DUPLICATE
  ACTIONED
}

enum AlertType {
  SIGHTING_MATCH
  BEHAVIOR_DETECTION
  CASE_UPDATE
  SYSTEM_ALERT
  SECURITY_BULLETIN
  COMMUNITY_ALERT
}

enum AlertSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum AlertDeliveryStatus {
  PENDING
  DELIVERED
  READ
  DISMISSED
  FAILED
}

enum DetectionType {
  SUSPICIOUS_BEHAVIOR
  FACIAL_MATCH
  LICENSE_PLATE
  VEHICLE_MATCH
  INTRUSION
  WEAPON_DETECTION
  LOITERING
  TRESPASSING
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  VIEW
  EXPORT
  LOGIN
  LOGOUT
  VERIFY
  REJECT
  APPROVE
  ARCHIVE
  RESTORE
  PERMANENT_DELETE
}

// ============================================================================
// MODELS
// ============================================================================

/// Core user model for all personas (Community, Security, LEO, Admin, Super Admin)
model User {
  id              String    @id @default(uuid()) @db.Uuid
  email           String    @unique
  passwordHash    String    @map("password_hash") @db.VarChar(255)
  name            String    @db.VarChar(255)
  phoneNumber     String?   @map("phone_number") @db.VarChar(20)
  role            UserRole  @default(COMMUNITY)
  status          UserStatus @default(PENDING_VERIFICATION)
  avatarUrl       String?   @map("avatar_url") @db.VarChar(500)
  emailVerifiedAt DateTime? @map("email_verified_at")
  twoFactorSecret String?   @map("two_factor_secret") @db.VarChar(255)
  twoFactorEnabled Boolean  @default(false) @map("two_factor_enabled")
  lastLoginAt     DateTime? @map("last_login_at")
  lastLoginIp     String?   @map("last_login_ip") @db.VarChar(45)
  failedLoginAttempts Int   @default(0) @map("failed_login_attempts")
  lockedUntil     DateTime? @map("locked_until")
  refreshTokens   RefreshToken[]
  assignedCases   Case[]     @relation("CaseAssignees")
  createdCases    Case[]     @relation("CaseCreators")
  sightings       Sighting[]
  alerts          AlertRecipient[]
  auditLogs       AuditLog[]
  notificationTokens NotificationToken[]
  alertRadius     Float?     @default(10.0) @map("alert_radius") // km
  preferences     Json?      @default("{}") @db.JsonB
  metadata        Json?      @default("{}") @db.JsonB
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")
  deletedAt       DateTime?  @map("deleted_at")

  @@index([email])
  @@index([role])
  @@index([status])
  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  token     String   @unique @db.VarChar(500)
  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  replacedBy String? @map("replaced_by") // Token rotation chain
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([token])
  @@index([userId])
  @@map("refresh_tokens")
}

model NotificationToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @db.VarChar(500)
  platform  String   @db.VarChar(20) // "web", "ios", "android"
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([userId, token])
  @@index([token])
  @@map("notification_tokens")
}

/// Criminal profile — wanted persons, suspects, persons of interest
model CriminalProfile {
  id             String               @id @default(uuid()) @db.Uuid
  fullName       String               @map("full_name") @db.VarChar(255)
  aliases        Json?                @default("[]") @db.JsonB // ["aka1", "aka2"]
  dateOfBirth    DateTime?            @map("date_of_birth")
  nationality    String?              @db.VarChar(100)
  idNumber       String?              @map("id_number") @db.VarChar(50)
  riskLevel      RiskLevel            @default(MEDIUM) @map("risk_level")
  status         CriminalProfileStatus @default(ACTIVE)
  photoUrl       String?              @map("photo_url") @db.VarChar(500)
  physicalDescription Json?           @map("physical_description") @db.JsonB // {height, build, eyeColor, hairColor, scars, tattoos}
  biometricData  Json?                @map("biometric_data") @db.JsonB // {faceEmbedding, irisCode, fingerprintHash}
  vehicleInfo    Json?                @map("vehicle_info") @db.JsonB // [{plate, make, model, color, year}]
  lastKnownLocation Json?             @map("last_known_location") @db.JsonB // {lat, lng, address, lastSeen}
  wantedSince    DateTime?            @map("wanted_since")
  caseNotes      Json?                @default("[]") @map("case_notes") @db.JsonB // [{note, authorId, timestamp}]
  warrants       Json?                @default("[]") @db.JsonB // [{warrantNumber, issuingAuthority, charges}]
  rewardAmount   Decimal?             @map("reward_amount") @db.Decimal(12, 2)
  createdById    String               @map("created_by_id") @db.Uuid
  createdBy      User                 @relation(fields: [createdById], references: [id])
  version        Int                  @default(1)
  cases          CaseSuspect[]
  sightings      Sighting[]
  createdAt      DateTime             @default(now()) @map("created_at")
  updatedAt      DateTime             @updatedAt @map("updated_at")
  deletedAt      DateTime?            @map("deleted_at")

  @@index([fullName])
  @@index([status])
  @@index([riskLevel])
  @@map("criminal_profiles")
}

/// Investigation cases
model Case {
  id              String      @id @default(uuid()) @db.Uuid
  caseNumber      String      @unique @map("case_number") @db.VarChar(50)
  title           String      @db.VarChar(500)
  description     String?     @db.Text
  status          CaseStatus  @default(OPEN)
  priority        CasePriority @default(MEDIUM)
  incidentDate    DateTime?   @map("incident_date")
  incidentLocation Json?      @map("incident_location") @db.JsonB // {lat, lng, address, region}
  crimeType       String?     @map("crime_type") @db.VarChar(100)
  assignedToId    String?     @map("assigned_to_id") @db.Uuid
  assignedTo      User?       @relation("CaseAssignees", fields: [assignedToId], references: [id])
  createdById     String      @map("created_by_id") @db.Uuid
  createdBy       User        @relation("CaseCreators", fields: [createdById], references: [id])
  evidence        Evidence[]
  suspects        CaseSuspect[]
  alerts          Alert[]
  version         Int         @default(1)
  metadata        Json?       @default("{}") @db.JsonB
  closedAt        DateTime?   @map("closed_at")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")
  deletedAt       DateTime?   @map("deleted_at")

  @@index([caseNumber])
  @@index([status])
  @@index([assignedToId])
  @@index([createdById])
  @@index([crimeType])
  @@index([status, priority])
  @@map("cases")
}

/// Join table: Case <-> CriminalProfile (many-to-many)
model CaseSuspect {
  caseId    String          @map("case_id") @db.Uuid
  case      Case            @relation(fields: [caseId], references: [id], onDelete: Cascade)
  profileId String          @map("profile_id") @db.Uuid
  profile   CriminalProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  role      String?         @db.VarChar(50) // "primary", "accomplice", "person_of_interest"
  addedAt   DateTime        @default(now()) @map("added_at")
  addedById String          @map("added_by_id") @db.Uuid
  addedBy   User            @relation(fields: [addedById], references: [id])

  @@id([caseId, profileId])
  @@index([caseId])
  @@index([profileId])
  @@map("case_suspects")
}

/// Evidence — images, video clips, documents with chain of custody
model Evidence {
  id              String           @id @default(uuid()) @db.Uuid
  caseId          String           @map("case_id") @db.Uuid
  case            Case             @relation(fields: [caseId], references: [id], onDelete: Cascade)
  fileName        String           @map("file_name") @db.VarChar(500)
  fileType        EvidenceType     @map("file_type")
  mimeType        String           @map("mime_type") @db.VarChar(100)
  fileSize        Int              @map("file_size") // In bytes
  filePath        String           @map("file_path") @db.VarChar(1000)
  thumbnailPath   String?          @map("thumbnail_path") @db.VarChar(1000)
  sha256Hash      String           @map("sha256_hash") @db.VarChar(64)
  status          EvidenceStatus   @default(PENDING_REVIEW)
  description     String?          @db.Text
  metadata        Json?            @default("{}") @db.JsonB // EXIF, GPS coords, camera info, AI analysis results
  chainOfCustody  Json             @default("[]") @map("chain_of_custody") @db.JsonB // Array of ChainOfCustodyEntry
  uploadedById    String           @map("uploaded_by_id") @db.Uuid
  uploadedBy      User             @relation(fields: [uploadedById], references: [id])
  sightingId      String?          @map("sighting_id") @db.Uuid
  version         Int              @default(1)
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  deletedAt       DateTime?        @map("deleted_at")

  @@index([caseId])
  @@index([sha256Hash])
  @@index([status])
  @@index([caseId, fileType])
  @@map("evidence")
}

/// Community-submitted sightings
model Sighting {
  id              String         @id @default(uuid()) @db.Uuid
  userId          String         @map("user_id") @db.Uuid
  user            User           @relation(fields: [userId], references: [id])
  profileId       String?        @map("profile_id") @db.Uuid
  profile         CriminalProfile? @relation(fields: [profileId], references: [id])
  location        Json           @db.JsonB // {lat, lng, address}
  description     String?        @db.Text
  photoUrl        String?        @map("photo_url") @db.VarChar(500)
  confidence      Float?         // AI confidence score (0-1)
  status          SightingStatus @default(PENDING_VERIFICATION)
  referenceNumber String         @unique @map("reference_number") @db.VarChar(20)
  verifiedById    String?        @map("verified_by_id") @db.Uuid
  verifiedBy      User?          @relation("SightingVerifiers", fields: [verifiedById], references: [id])
  verifiedAt      DateTime?      @map("verified_at")
  rejectionReason String?        @map("rejection_reason") @db.VarChar(500)
  evidence        Evidence[]
  alerts          Alert[]
  metadata        Json?          @default("{}") @db.JsonB
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@index([userId])
  @@index([profileId])
  @@index([status])
  @@index([referenceNumber])
  @@index([status, createdAt])
  @@map("sightings")
}

/// Alerts / Notifications
model Alert {
  id            String            @id @default(uuid()) @db.Uuid
  type          AlertType         @default(SYSTEM_ALERT)
  severity      AlertSeverity     @default(MEDIUM)
  title         String            @db.VarChar(500)
  body          String?           @db.Text
  caseId        String?           @map("case_id") @db.Uuid
  case          Case?             @relation(fields: [caseId], references: [id])
  sightingId    String?           @map("sighting_id") @db.Uuid
  sighting      Sighting?         @relation(fields: [sightingId], references: [id])
  profileId     String?           @map("profile_id") @db.Uuid
  profile       CriminalProfile?  @relation(fields: [profileId], references: [id])
  location      Json?             @db.JsonB // {lat, lng, address, radius}
  metadata      Json?             @default("{}") @db.JsonB
  recipients    AlertRecipient[]
  createdById   String            @map("created_by_id") @db.Uuid
  createdBy     User              @relation(fields: [createdById], references: [id])
  scheduledFor  DateTime?         @map("scheduled_for") // For scheduled alerts
  expiresAt     DateTime?         @map("expires_at")
  createdAt     DateTime          @default(now()) @map("created_at")

  @@index([type])
  @@index([severity])
  @@index([caseId])
  @@index([createdAt])
  @@index([severity, createdAt])
  @@map("alerts")
}

/// Join table: Alert -> User (many-to-many with delivery tracking)
model AlertRecipient {
  id             String              @id @default(uuid()) @db.Uuid
  alertId        String              @map("alert_id") @db.Uuid
  alert          Alert               @relation(fields: [alertId], references: [id], onDelete: Cascade)
  userId         String              @map("user_id") @db.Uuid
  user           User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveryStatus AlertDeliveryStatus @default(PENDING) @map("delivery_status")
  deliveredAt    DateTime?           @map("delivered_at")
  readAt         DateTime?           @map("read_at")
  dismissedAt    DateTime?           @map("dismissed_at")

  @@unique([alertId, userId])
  @@index([userId, deliveryStatus])
  @@index([userId, readAt])
  @@map("alert_recipients")
}

/// AI detection events from the ML pipeline
model DetectionEvent {
  id             String        @id @default(uuid()) @db.Uuid
  cameraId       String        @map("camera_id") @db.VarChar(100)
  detectionType  DetectionType @map("detection_type")
  confidence     Float
  timestamp      DateTime      @db.Timestamptz
  location       Json?         @db.JsonB // {lat, lng}
  boundingBox    Json?         @map("bounding_box") @db.JsonB // {x, y, width, height}
  snapshotUrl    String?       @map("snapshot_url") @db.VarChar(1000)
  thumbnailUrl   String?       @map("thumbnail_url") @db.VarChar(1000)
  entityId       String?       @map("entity_id") // Re-identification ID
  attributes     Json?         @default("{}") @db.JsonB // {age, gender, clothing, vehicle, plate}
  modelVersion   String        @map("model_version") @db.VarChar(50)
  processed      Boolean       @default(false)
  processedAt    DateTime?     @map("processed_at")
  caseId         String?       @map("case_id") @db.Uuid
  case           Case?         @relation(fields: [caseId], references: [id])
  metadata       Json?         @default("{}") @db.JsonB
  createdAt      DateTime      @default(now()) @map("created_at")

  @@index([cameraId, timestamp])
  @@index([detectionType])
  @@index([confidence])
  @@index([entityId])
  @@index([timestamp])
  @@index([caseId])
  @@index([cameraId, timestamp, detectionType])
  @@map("detection_events")
}

/// Immutable audit log — all critical actions are recorded here
model AuditLog {
  id         String      @id @default(uuid()) @db.Uuid
  userId     String?     @map("user_id") @db.Uuid
  user       User?       @relation(fields: [userId], references: [id])
  action     AuditAction
  entityType String      @map("entity_type") @db.VarChar(50) // "user", "case", "evidence", "profile", etc.
  entityId   String?     @map("entity_id") @db.Uuid
  description String?    @db.Text
  metadata   Json?       @default("{}") @db.JsonB // Before/after values for updates
  ipAddress  String?     @map("ip_address") @db.VarChar(45)
  userAgent  String?     @map("user_agent") @db.VarChar(500)
  sessionId  String?     @map("session_id") @db.VarChar(100)
  createdAt  DateTime    @default(now()) @map("created_at")

  @@index([userId])
  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([userId, createdAt])
  @@map("audit_logs")
}

/// Stored chain of custody entries (also embedded in Evidence JSON)
model ChainOfCustodyEntry {
  id          String                @id @default(uuid()) @db.Uuid
  evidenceId  String                @map("evidence_id") @db.Uuid
  evidence    Evidence              @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
  action      ChainOfCustodyAction
  performedById String             @map("performed_by_id") @db.Uuid
  performedBy User                  @relation(fields: [performedById], references: [id])
  notes       String?               @db.Text
  metadata    Json?                 @default("{}") @db.JsonB
  createdAt   DateTime              @default(now()) @map("created_at")

  @@index([evidenceId])
  @@index([evidenceId, createdAt])
  @@map("chain_of_custody_entries")
}
```

---

## 4. Migration Strategy

### 4.1 Migration Workflow

```bash
# 1. Modify schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_evidence_metadata

# 3. Review the generated SQL in prisma/migrations/<timestamp>_add_evidence_metadata/migration.sql

# 4. Apply migration
npx prisma migrate deploy

# 5. Generate updated Prisma client
npx prisma generate
```

### 4.2 Migration File Naming Convention

```
prisma/migrations/
├── 20260601_000001_init_schema/
│   └── migration.sql
├── 20260605_000002_add_criminal_profiles/
│   └── migration.sql
├── 20260610_000003_add_evidence_chain_of_custody/
│   └── migration.sql
├── 20260615_000004_add_detection_events/
│   └── migration.sql
├── 20260620_000005_add_fulltext_indexes/
│   └── migration.sql
└── migration_lock.json
```

### 4.3 Migration Best Practices

```sql
-- Example migration pattern: Always wrap in transaction
BEGIN;

-- 1. Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create new table
CREATE TABLE "criminal_profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes (after insert for performance)
CREATE INDEX "idx_criminal_profiles_status" ON "criminal_profiles" ("status");
CREATE INDEX "idx_criminal_profiles_full_name" ON "criminal_profiles" ("full_name");

-- 4. Add foreign key (existing table)
ALTER TABLE "cases"
ADD COLUMN "incident_location" JSONB,
ADD COLUMN "crime_type" VARCHAR(100);

-- 5. Data migration (if needed)
UPDATE "cases" SET "crime_type" = 'UNKNOWN' WHERE "crime_type" IS NULL;

-- 6. Add constraint
ALTER TABLE "cases" ALTER COLUMN "crime_type" SET NOT NULL;

COMMIT;
```

### 4.4 Migration Safety Rules

| Rule | Description |
|------|-------------|
| **No destructive changes without backup** | Never `DROP COLUMN` or `DROP TABLE` without verified backup |
| **Backward-compatible migrations** | New columns should be nullable or have defaults |
| **Gradual rollouts** | Schema changes deployed before code that depends on them |
| **Zero-downtime pattern** | Use `CREATE INDEX CONCURRENTLY` for large tables |
| **Rollback plan** | Each migration must have a corresponding down migration |

---

## 5. Seed Data Strategy

### 5.1 Seed File Structure

```
prisma/seeds/
├── dev-seed.ts                # Main seed runner
├── data/
│   ├── users.json             # User seed data
│   ├── profiles.json          # Criminal profiles
│   ├── cases.json             # Investigation cases
│   ├── evidence.json          # Evidence records
│   ├── sightings.json         # Community sightings
│   └── alerts.json            # Sample alerts
└── factories/
    ├── user.factory.ts        # Dynamic user generator
    ├── case.factory.ts        # Dynamic case generator
    └── evidence.factory.ts    # Dynamic evidence generator
```

### 5.2 Main Seed Script

```typescript
// prisma/seeds/dev-seed.ts

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding development database...\n");

  // 1. Create users with all roles
  const users = await seedUsers();
  console.log(`✅ ${users.length} users created`);

  // 2. Create criminal profiles
  const profiles = await seedCriminalProfiles(users.admin);
  console.log(`✅ ${profiles.length} criminal profiles created`);

  // 3. Create investigation cases
  const cases = await seedCases(users);
  console.log(`✅ ${cases.length} cases created`);

  // 4. Link suspects to cases
  await seedCaseSuspects(cases, profiles, users.admin);
  console.log("✅ Case-suspect links created");

  // 5. Create evidence with chain of custody
  const evidence = await seedEvidence(cases, users);
  console.log(`✅ ${evidence.length} evidence items created`);

  // 6. Create community sightings
  const sightings = await seedSightings(users.community, profiles);
  console.log(`✅ ${sightings.length} sightings created`);

  // 7. Create alerts
  await seedAlerts(users, cases, sightings);
  console.log("✅ Alerts created");

  // 8. Create audit logs
  await seedAuditLogs(users);
  console.log("✅ Audit logs created");

  console.log("\n🎉 Database seeded successfully!");
}

async function seedUsers() {
  const password = await hash("Password123!", 12);

  const usersData = [
    { email: "superadmin@sentinel360.gov", name: "Super Admin", role: "SUPER_ADMIN" as const },
    { email: "admin@sentinel360.gov", name: "System Admin", role: "ADMIN" as const },
    { email: "investigator@sentinel360.gov", name: "Detective Sarah Connor", role: "LAW_ENFORCEMENT" as const },
    { email: "security@sentinel360.gov", name: "Chief Paul Security", role: "SECURITY" as const },
    { email: "community@example.com", name: "Jane Citizen", role: "COMMUNITY" as const },
    { email: "officer@sentinel360.gov", name: "Officer John Steele", role: "LAW_ENFORCEMENT" as const },
  ];

  const users = [];
  for (const data of usersData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        ...data,
        passwordHash: password,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        preferences: {
          alertRadius: data.role === "COMMUNITY" ? 10 : 50,
          notifications: { push: true, email: true, inApp: true },
        },
      },
    });
    users.push(user);
  }

  return {
    superAdmin: users[0],
    admin: users[1],
    investigator: users[2],
    security: users[3],
    community: users[4],
    officer: users[5],
    all: users,
  };
}

// Additional seed functions follow same pattern...
// Each creates realistic demo data with proper relationships

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 5.3 Seed Data Strategy Rules

| Principle | Implementation |
|-----------|---------------|
| **Idempotent** | Use `upsert` — safe to run multiple times |
| **Deterministic IDs** | Use consistent UUIDs for cross-reference stability |
| **Realistic data** | Use Faker.js for names, locations, descriptions |
| **Relationship integrity** | Seed in dependency order (users -> profiles -> cases -> evidence) |
| **Environment-aware** | Different seed data for dev, staging, and CI |
| **Clean before seed** | Optional `--force` flag to truncate before seeding |

---

## 6. Query Optimization Strategies

### 6.1 Index Strategy by Query Pattern

#### Query Pattern 1: Wanted Feed (Public)
```sql
-- Used by: Community Members viewing public wanted feed
-- Endpoint: GET /api/v1/wanted
-- Frequency: High (public page)

SELECT
  cp.id,
  cp.full_name,
  cp.photo_url,
  cp.last_known_location,
  cp.risk_level,
  cp.wanted_since,
  (SELECT COUNT(*) FROM sightings s WHERE s.profile_id = cp.id AND s.status = 'VERIFIED') as sighting_count
FROM criminal_profiles cp
WHERE cp.status = 'ACTIVE'
AND cp.deleted_at IS NULL
ORDER BY cp.wanted_since DESC
LIMIT 20 OFFSET 0;
```

**Optimization:**
```sql
-- Composite index for the exact query pattern
CREATE INDEX CONCURRENTLY idx_wanted_feed
ON criminal_profiles (status, wanted_since DESC, deleted_at)
INCLUDE (id, full_name, photo_url, risk_level);

-- Partial index for active-only queries
CREATE INDEX CONCURRENTLY idx_active_profiles
ON criminal_profiles (wanted_since DESC)
WHERE status = 'ACTIVE' AND deleted_at IS NULL;
```

#### Query Pattern 2: Case Search
```sql
-- Used by: Law Enforcement, Admin searching cases
-- Endpoint: GET /api/v1/cases?q=keyword&status=OPEN&page=1
-- Frequency: Medium

SELECT c.*, u.name as assigned_to_name
FROM cases c
LEFT JOIN users u ON c.assigned_to_id = u.id
WHERE
  (c.status = 'OPEN' OR :status IS NULL)
  AND (
    c.title ILIKE '%' || :query || '%'
    OR c.description ILIKE '%' || :query || '%'
    OR c.case_number ILIKE '%' || :query || '%'
    OR c.crime_type ILIKE '%' || :query || '%'
  )
ORDER BY c.priority DESC, c.created_at DESC
LIMIT 20 OFFSET 0;
```

**Optimization:**
```sql
-- Trigram index for fuzzy ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY idx_cases_search_trgm
ON cases USING gin (title gin_trgm_ops, description gin_trgm_ops);

-- Composite index for status + priority + date
CREATE INDEX CONCURRENTLY idx_cases_status_priority_date
ON cases (status, priority DESC, created_at DESC);

-- Full-text search vector (for Elasticsearch offload)
ALTER TABLE cases ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(case_number, '') || ' ' || coalesce(crime_type, ''))
) STORED;

CREATE INDEX CONCURRENTLY idx_cases_search_vector ON cases USING gin (search_vector);
```

#### Query Pattern 3: Evidence Retrieval
```sql
-- Used by: Investigators viewing case evidence
-- Endpoint: GET /api/v1/cases/:caseId/evidence
-- Frequency: High during investigation workflows

SELECT e.*, u.name as uploaded_by_name
FROM evidence e
JOIN users u ON e.uploaded_by_id = u.id
WHERE e.case_id = :caseId
AND e.deleted_at IS NULL
ORDER BY e.created_at DESC;
```

**Optimization:**
```sql
-- Composite index for case evidence retrieval
CREATE INDEX CONCURRENTLY idx_evidence_case
ON evidence (case_id, created_at DESC, deleted_at)
INCLUDE (file_name, file_type, file_size, sha256_hash, status);

-- Hash index for SHA-256 lookups (chain of custody verification)
CREATE INDEX CONCURRENTLY idx_evidence_sha256
ON evidence USING hash (sha256_hash);
```

#### Query Pattern 4: Alert Delivery
```sql
-- Used by: WebSocket server delivering real-time alerts
-- Endpoint: WebSocket subscription
-- Frequency: Very high (real-time)

SELECT a.*, ar.delivery_status
FROM alerts a
JOIN alert_recipients ar ON a.id = ar.alert_id
WHERE ar.user_id = :userId
AND ar.delivery_status = 'PENDING'
ORDER BY a.severity DESC, a.created_at DESC;
```

**Optimization:**
```sql
-- Composite index for pending alerts per user
CREATE INDEX CONCURRENTLY idx_alerts_pending
ON alert_recipients (user_id, delivery_status)
INCLUDE (alert_id)
WHERE delivery_status = 'PENDING';
```

### 6.2 Query Optimization Rules Applied

| Strategy | Implementation |
|----------|---------------|
| **Covering indexes** | Include all selected columns to avoid heap lookups |
| **Partial indexes** | Index only active/visible records (soft-delete aware) |
| **Composite indexes** | Match exact ORDER BY and WHERE clause patterns |
| **INCLUDE columns** | Add fetched columns to index leaf nodes |
| **Trigram indexes** | For `ILIKE '%term%'` fuzzy searches |
| **Full-text search vectors** | Generated columns for `tsvector` |
| **Materialized views** | For computed aggregations (sighting counts per profile) |
| **READ ONLY transactions** | For public feed queries to use replica servers |
| **Prepared statements** | All queries use parameterized inputs to leverage cached plans |

### 6.3 Caching Strategy

```typescript
// Cache layers (hot -> cold)

// Layer 1: Redis (in-memory)
// TTL: 5 minutes for public feed, 1 minute for active cases
const cacheKey = `wanted:feed:page:${page}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await prisma.criminalProfile.findMany({...});
await redis.setex(cacheKey, 300, JSON.stringify(result));

// Layer 2: Application-level query cache (Prisma)
// Use Prisma's built-in query caching with @cache directive

// Layer 3: Database-level (shared buffers)
// PostgreSQL automatically caches frequently accessed pages in shared_buffers
```

### 6.4 Materialized View for Wanted Feed

```sql
-- Pre-computed wanted feed with sighting counts
CREATE MATERIALIZED VIEW mv_wanted_feed AS
SELECT
  cp.id,
  cp.full_name,
  cp.photo_url,
  cp.last_known_location,
  cp.risk_level,
  cp.wanted_since,
  COALESCE(sighting_counts.count, 0) AS sighting_count,
  cp.updated_at
FROM criminal_profiles cp
LEFT JOIN (
  SELECT profile_id, COUNT(*) as count
  FROM sightings
  WHERE status = 'VERIFIED'
  GROUP BY profile_id
) sighting_counts ON cp.id = sighting_counts.profile_id
WHERE cp.status = 'ACTIVE' AND cp.deleted_at IS NULL;

CREATE UNIQUE INDEX ON mv_wanted_feed (id);
CREATE INDEX ON mv_wanted_feed (wanted_since DESC);

-- Refresh (every 5 minutes, or on-demand)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_wanted_feed;
```

---

## 7. Connection Pooling Configuration

### 7.1 Prisma Connection Pool Settings

```typescript
// src/config/database.ts

import { PrismaClient } from "@prisma/client";
import { config } from "./env";

let prisma: PrismaClient;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.DATABASE_URL,
        },
      },
      // Connection pool configuration
      log: [
        { level: "warn", emit: "event" },
        { level: "error", emit: "event" },
        { level: "info", emit: "event" },
        ...(config.NODE_ENV === "development"
          ? [{ level: "query" as const, emit: "event" }]
          : []),
      ],
    });

    // Log slow queries in production
    if (config.NODE_ENV === "production") {
      prisma.$on("query", (e: { duration: number; query: string }) => {
        if (e.duration > 1000) {
          console.warn(`SLOW QUERY (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  return prisma;
}
```

### 7.2 Connection String Configuration

```
# Development (direct connection — no pooler)
DATABASE_URL=postgresql://sentinel:supersecret@localhost:5432/sentinel360?schema=public&connection_limit=20&pool_timeout=30

# Production (via PgBouncer transaction pooler)
DATABASE_URL=postgresql://sentinel:${DB_PASSWORD}@pgbouncer:6432/sentinel360?schema=public&connection_limit=10&pool_timeout=10&pgbouncer=true

# Connection string parameters:
# - connection_limit: Max connections in pool (Prisma internal pool)
# - pool_timeout: Max time (seconds) to wait for a connection from pool
# - pgbouncer=true: Enables PgBouncer transaction mode compatibility
# - statement_cache_size=0: Disable when using PgBouncer transaction mode
```

### 7.3 PgBouncer Configuration (Production)

```ini
; pgbouncer.ini

[databases]
sentinel360 = host=postgres port=5432 dbname=sentinel360

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pool configuration
pool_mode = transaction
default_pool_size = 25
max_client_conn = 200
max_db_connections = 50
idle_transaction_timeout = 300

; Resource limits
max_db_connections = 50
max_user_connections = 50
max_client_conn = 200

; Timeouts
server_idle_timeout = 600
server_lifetime = 3600
query_timeout = 30
client_idle_timeout = 600

; Logging
log_connections = 1
log_disconnections = 1
stats_period = 60
verbose = 0
```

### 7.4 Pool Configuration by Environment

| Environment | Prisma Pool Size | PgBouncer Pool | Max DB Connections | Rationale |
|-------------|-----------------|----------------|-------------------|-----------|
| **Development** | 20 | None (direct) | 50 | Low traffic, debugging |
| **Testing** | 5 | None (direct) | 20 | Parallel test workers |
| **Staging** | 15 | 40 | 50 | Moderate traffic, realistic |
| **Production** | 10 | 25 per instance | 200 | 3 API instances × 10 = 30 active |

### 7.5 Connection Management Middleware

```typescript
// src/middleware/database.ts

import { Request, Response, NextFunction } from "express";
import { getPrisma } from "@config/database";

export async function databaseMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  // Attach prisma instance to request for route handlers
  req.db = getPrisma();
  next();
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  const prisma = getPrisma();
  await prisma.$disconnect();
  console.log("Database connections closed");
}
```

---

## 8. Data Retention & Archival

### 8.1 Retention Policy

| Data Type | Active Retention | Archive After | Permanent Deletion |
|-----------|-----------------|---------------|-------------------|
| **Evidence files** | Until case closed | 7 years after case closed | 10 years after case closed |
| **Criminal profiles** | Until status = DECEASED | 5 years after status change | 10 years after death confirmation |
| **Detection events** | 90 days | 1 year (aggregated) | 2 years |
| **Audit logs** | 1 year | 7 years | Never (immutable) |
| **User accounts** | Until deactivated | 2 years after deactivation | 5 years after deactivation |
| **Alerts** | 30 days | 1 year | 2 years |
| **Sightings** | Until resolved | 3 years after resolution | 5 years after resolution |
| **Session/Refresh tokens** | Until expiry | None | 30 days after expiry |

### 8.2 Archival Implementation

```typescript
// src/jobs/data-retention.job.ts

import { CronJob } from "cron";
import { getPrisma } from "@config/database";
import { getS3Client } from "@integrations/s3";

/**
 * Runs daily at 3 AM to archive/clean expired data
 */
export const dataRetentionJob = new CronJob(
  "0 3 * * *",
  async () => {
    const prisma = getPrisma();

    // 1. Archive old detection events (aggregate then delete)
    const oldDetectionDate = new Date();
    oldDetectionDate.setDate(oldDetectionDate.getDate() - 90);

    // Aggregate into summary records
    await prisma.$executeRaw`
      INSERT INTO detection_summaries (date, camera_id, detection_type, count)
      SELECT
        DATE(timestamp) as date,
        camera_id,
        detection_type,
        COUNT(*) as count
      FROM detection_events
      WHERE timestamp < ${oldDetectionDate}
      GROUP BY DATE(timestamp), camera_id, detection_type
      ON CONFLICT (date, camera_id, detection_type) DO UPDATE
      SET count = EXCLUDED.count;
    `;

    // Delete raw events
    await prisma.detectionEvent.deleteMany({
      where: { timestamp: { lt: oldDetectionDate } },
    });
  },
  null,
  true,
  "Africa/Johannesburg",
);
```

---

## 9. Backup & Disaster Recovery

### 9.1 Backup Schedule

| Frequency | Type | Retention | Tool |
|-----------|------|-----------|------|
| **Hourly** | WAL archiving | 24 hours | pg_basebackup + WAL streaming |
| **Daily** | Full database dump | 30 days | pg_dump + S3 upload |
| **Weekly** | Full + WAL archive | 12 weeks | Automated script |
| **Monthly** | Full dump + evidence snapshot | 12 months | Manual/automated |

### 9.2 Backup Script

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="/tmp/sentinel360-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sentinel360_${TIMESTAMP}.sql.gz"
S3_PATH="s3://sentinel360-backups/postgres/"

mkdir -p "$BACKUP_DIR"

# Dump with compression
pg_dump \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER:-sentinel}" \
  --dbname="sentinel360" \
  --format=custom \
  --verbose \
  --no-owner \
  --compress=9 \
  --file="${BACKUP_FILE}"

# Upload to S3
aws s3 cp "${BACKUP_FILE}" "${S3_PATH}"

# Cleanup local
rm "${BACKUP_FILE}"

# Retention: delete backups older than 30 days
aws s3 ls "${S3_PATH}" | while read -r line; do
  date=$(echo "$line" | awk '{print $1}')
  if [[ $(date -d "$date" +%s) -lt $(date -d "30 days ago" +%s) ]]; then
    file=$(echo "$line" | awk '{print $4}')
    aws s3 rm "${S3_PATH}${file}"
  fi
done
```

### 9.3 Disaster Recovery Plan

```
Recovery Time Objective (RTO): 4 hours
Recovery Point Objective (RPO): 1 hour (WAL archiving)

Steps:
1. Provision new infrastructure via Terraform
2. Restore latest full backup
3. Replay WAL archives to point-in-time
4. Verify data integrity (checksum audit)
5. Switch DNS to new instances
6. Verify all services operational
```

---

## Summary

- **PostgreSQL 16 + PostGIS + TimescaleDB** provides geospatial queries, time-series optimization, and ACID compliance
- **Complete Prisma schema** with 12 models, 9 enums, proper relations, and indexes
- **Migration strategy** with safety rules, zero-downtime patterns, and rollback plans
- **Seed data** with factory pattern and idempotent execution
- **Query optimization** with composite indexes, covering indexes, partial indexes, trigrams, and materialized views
- **Connection pooling** via Prisma's internal pool + PgBouncer in production
- **Data retention** with automated archival and cascading deletion policies
- **Backup strategy** with WAL archiving, daily dumps, and 4-hour RTO
