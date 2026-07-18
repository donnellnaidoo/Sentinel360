# Sentinel360 — Database Migration Guide

> **Document:** 07-DATABASE/02-migration-guide.md  
> **Version:** 1.0  
> **Status:** Draft  
> **Last Updated:** June 2026

---

## Table of Contents

1. [Migration Strategy](#migration-strategy)
2. [Migration File Organization](#migration-file-organization)
3. [Migration Directory Structure](#migration-directory-structure)
4. [Prerequisites](#prerequisites)
5. [Applying Migrations](#applying-migrations)
6. [Creating New Migrations](#creating-new-migrations)
7. [Rollback Strategy](#rollback-strategy)
8. [Migration Inventory](#migration-inventory)
9. [Integration with `packages/db/`](#integration-with-packagesdb)
10. [Troubleshooting](#troubleshooting)

---

## Migration Strategy

### Supabase Native Migrations (No Drizzle)

Sentinel360 uses **Supabase native SQL migrations** managed through the Supabase CLI (`supabase migration`). This is a deliberate departure from the previous Drizzle-based approach.

#### Why Supabase Native Over Drizzle?

| Factor | Drizzle (`drizzle-kit`) | Supabase Native (`supabase migration`) |
|--------|------------------------|----------------------------------------|
| **Auditability** | Generated SQL can differ from intent | Hand-written SQL is explicit and reviewable |
| **Fine-grained control** | Limited for PostGIS, pgvector, partitioning | Full PostgreSQL DDL capability |
| **Supabase integration** | Requires separate apply step | `supabase db push` applies directly to linked project |
| **Diff accuracy** | Schema push can miss edge cases | Manual SQL is deterministic |
| **Reviewability** | PRs show generated migration files | PRs show deliberate SQL with comments |
| **Rollback** | No native rollback path | Down-migration files provide explicit undo |

#### When to Use Drizzle (Still)

Drizzle ORM remains the **runtime query builder** for application code. The `drizzle-orm` package is used in the application layer for type-safe queries. What changes is the **migration pipeline** — instead of `drizzle-kit generate` producing migrations from TypeScript schema files, we write SQL migrations by hand and apply them with Supabase CLI.

---

## Migration File Organization

### Naming Convention

Every migration file follows this structure:

```
<timestamp>_<domain>_<description>.sql
```

| Component | Format | Example |
|-----------|--------|---------|
| **Timestamp** | `YYYYMMDDHHMMSS` | `20260613000001` |
| **Domain** | Lowercase, single word | `users`, `profiles`, `cases` |
| **Description** | snake_case, descriptive | `create_users_auth_tables` |

**Full example:** `20260613000001_users_create_users_auth_tables.sql`

### Idempotency

Every migration must be **idempotent** — safe to run multiple times. Two patterns are used throughout:

**Pattern 1: `IF NOT EXISTS` / `IF EXISTS`**

```sql
CREATE TABLE IF NOT EXISTS users ( ... );
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
```

**Pattern 2: Idempotent function wrapping**

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
        CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
END $$;
```

### Per-Domain Files

Migrations are organised **one domain per file** (not one table per file). This strikes a balance between:

- **Granularity**: Each domain can be reviewed, tested, and rolled back independently
- **Pagination**: Avoids thousands of tiny migration files that are hard to reason about

Domain boundaries align with the table prefixes defined in the schema design:

| Migration File | Domain | Tables |
|---------------|--------|--------|
| `*_extensions` | Extensions | pgcrypto, PostGIS, pgvector |
| `*_users` | Users & Auth | users, roles, user_roles, role_permissions, user_sessions, organizations, law_enforcement_officer, officer_verification |
| `*_profiles` | Criminal Profiles | criminal_profiles, profile_biometrics, profile_photos, profile_aliases, profile_known_associates, profile_last_locations, profile_threat_assessments |
| `*_cases` | Cases | cases, case_criminals, case_evidence, case_timeline_entries, case_activity_logs, case_notes, case_report |
| `*_evidence` | Evidence | evidence, evidence_chain_of_custody, evidence_tags |
| `*_sightings` | Sightings | sightings, sighting_media, sighting_verifications, community_sighting, anonymous_tip |
| `*_alerts` | Alerts | alerts, alert_recipients, alert_delivery_logs |
| `*_audit` | Audit | audit_logs + partitioning setup |
| `*_ai_ml` | AI / ML | ai_model_versions, ai_inference_results |
| `*_supporting` | Supporting | alpr_records, system_configuration |
| `*_indexes` | Indexes | Remaining indexes, pgvector setup |
| `*_seed` | Seed Data | Roles, permissions, system config defaults |

### Reversibility

Each forward migration must have a corresponding **down migration** in the `revert/` subdirectory:

```
migrations/
├── 20260613000001_users_create_users_auth_tables.sql
├── 20260613000002_profiles_create_criminal_profiles.sql
├── ...
└── revert/
    ├── 20260613000001_users_create_users_auth_tables.sql
    ├── 20260613000002_profiles_create_criminal_profiles.sql
    └── ...
```

The down migration reverses the forward migration exactly. This enables:

- Quick rollback in development
- Staged rollbacks in staging environments
- Database reset workflows during CI

---

## Migration Directory Structure

All Sentinel360 database migrations live under:

```
docs/07-DATABASE/migrations/
├── 20260613000001_users_create_users_auth_tables.sql       # Users & Auth domain
├── 20260613000002_profiles_create_criminal_profiles.sql     # Criminal Profiles domain
├── 20260613000003_cases_create_case_tables.sql              # Cases domain
├── 20260613000004_evidence_create_evidence_tables.sql       # Evidence domain
├── 20260613000005_sightings_create_sighting_tables.sql      # Sightings domain
├── 20260613000006_alerts_create_alert_tables.sql            # Alerts domain
├── 20260613000007_audit_create_audit_logs.sql               # Audit + partitioning
├── 20260613000008_ai_ml_create_ai_model_tables.sql          # AI / ML domain
├── 20260613000009_supporting_create_supporting_tables.sql   # ALPR, system_config, etc.
├── 20260613000010_indexes_create_remaining_indexes.sql      # All remaining indexes
├── 20260613000011_seed_seed_initial_data.sql                # Seed data
├── 20260701000001_features_create_entity_intelligence.sql   # Entity intelligence tables
├── 20260701000002_features_create_media_camera_tables.sql   # Media & camera tables
├── 20260701000003_features_create_edge_tables.sql           # Edge & infrastructure tables
├── 20260701000004_features_create_integration_tables.sql    # External integrations
├── 20260701000005_features_create_reconstruction_tables.sql # 3D reconstruction
├── 20260701000006_features_create_system_config_tables.sql  # System & configuration
└── revert/
    ├── 20260613000001_users_create_users_auth_tables.sql
    ├── 20260613000002_profiles_create_criminal_profiles.sql
    ├── 20260613000003_cases_create_case_tables.sql
    ├── 20260613000004_evidence_create_evidence_tables.sql
    ├── 20260613000005_sightings_create_sighting_tables.sql
    ├── 20260613000006_alerts_create_alert_tables.sql
    ├── 20260613000007_audit_create_audit_logs.sql
    ├── 20260613000008_ai_ml_create_ai_model_tables.sql
    ├── 20260613000009_supporting_create_supporting_tables.sql
    ├── 20260613000010_indexes_create_remaining_indexes.sql
    ├── 20260613000011_seed_seed_initial_data.sql
    ├── 20260701000001_features_create_entity_intelligence.sql
    ├── 20260701000002_features_create_media_camera_tables.sql
    ├── 20260701000003_features_create_edge_tables.sql
    ├── 20260701000004_features_create_integration_tables.sql
    ├── 20260701000005_features_create_reconstruction_tables.sql
    └── 20260701000006_features_create_system_config_tables.sql
```

The Supabase CLI expects migrations in `supabase/migrations/` by default. To use the `docs/07-DATABASE/migrations/` directory, we configure the Supabase project accordingly (see [Integration with `packages/db/`](#integration-with-packagesdb)).

---

## Prerequisites

Before working with migrations, ensure you have the following installed and configured:

### 1. Supabase CLI

```bash
# Install Supabase CLI (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
# Expected: >= 2.0.0
```

### 2. Supabase Project Link

```bash
# Link the local project to your Supabase project
# Run from the project root or packages/db/
supabase link --project-ref <your-project-ref>

# You will be prompted for your database password
# The project ref is found in your Supabase dashboard URL:
# https://supabase.com/dashboard/project/<project-ref>
```

### 3. Environment Variables

```bash
# Required variables in apps/server/.env or packages/db/.env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_DB_PASSWORD=<your-db-password>
DATABASE_URL=postgresql://postgres:<password>@<host>:<port>/postgres
```

### 4. Docker (for Local Development)

Supabase local development requires Docker:

```bash
# Start local Supabase stack
supabase start

# Check status
supabase status
```

---

## Applying Migrations

### To Local Development Database

```bash
# Step 1: Ensure local Supabase is running
supabase start

# Step 2: Apply all pending migrations
supabase db push

# To apply to a specific remote database:
# supabase db push --db-url <target-url>
```

The `supabase db push` command:

1. Reads all `.sql` files from the migrations directory in timestamp order
2. Applies them sequentially within a transaction (where possible)
3. Records each applied migration in the `supabase_migrations.schema_migrations` table
4. Skips already-applied migrations (based on filename)

### To Remote / Production Database

```bash
# Step 1: Link to remote project (one-time)
supabase link --project-ref <your-project-ref>

# Step 2: Apply migrations to remote
supabase db push

# For production, use the --db-url flag with the production connection string
supabase db push --db-url "$PROD_DATABASE_URL"
```

### Dry Run (Review SQL Before Applying)

```bash
# Print the SQL that would be executed without applying it
supabase db push --dry-run

# Output the migration plan
supabase db diff --linked
```

### Migration Status

```bash
# List applied and pending migrations
supabase migration list

# Output example:
#     LOCAL      |     REMOTE     |     TIME      |            FILE
#   ─────────────┼────────────────┼───────────────┼──────────────────────────────
#     PENDING    |      —         |  20260613000001 | users_create_users_auth_tables.sql
#     PENDING    |      —         |  20260613000002 | profiles_create_criminal_profiles.sql
```

---

## Creating New Migrations

### Standard Workflow

```bash
# Step 1: Create a new migration file
supabase migration new <descriptive-name>

# This creates: supabase/migrations/<timestamp>_<descriptive-name>.sql
# Example:
supabase migration new cases_add_evidence_priority

# Creates: supabase/migrations/20260615093045_cases_add_evidence_priority.sql
```

### Manual Creation (Preferred for Domain-Specific)

For domain-organized migrations outside the default `supabase/migrations/` directory, create the file manually:

```bash
# Step 1: Determine the next timestamp + sequence
# Format: YYYYMMDDHHMMSS_<domain>_<description>.sql
# Use the current UTC timestamp:
#   date -u +%Y%m%d%H%M%S
# Example output: 20260615093045

# Step 2: Create the file
touch docs/07-DATABASE/migrations/20260615093045_cases_add_evidence_priority.sql

# Step 3: Create the corresponding down migration
touch docs/07-DATABASE/migrations/revert/20260615093045_cases_add_evidence_priority.sql
```

### Migration File Template (Forward)

```sql
-- 20260615093045_cases_add_evidence_priority.sql
-- Adds priority column to case_evidence for evidence triage.
--
-- Domain: Cases
-- Dependencies: 20260613000003_cases_create_case_tables.sql
--
-- This migration is idempotent; safe to run multiple times.

-- Step 1: Add column (if not already present)
ALTER TABLE case_evidence
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20)
    DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- Step 2: Create index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_case_evidence_priority
    ON case_evidence(priority)
    WHERE removed_at IS NULL;

-- Step 3: Update existing rows (one-time data migration)
UPDATE case_evidence
SET priority = 'high'
WHERE relevance_notes ILIKE '%critical%'
  AND priority = 'medium';

-- Step 4: Log migration event
INSERT INTO system_configuration (config_key, config_value, description)
VALUES (
    'migration.cases_add_evidence_priority.applied_at',
    jsonb_build_object('value', NOW()),
    'Timestamp of the cases_add_evidence_priority migration'
)
ON CONFLICT (config_key) DO NOTHING;
```

### Migration File Template (Down / Revert)

```sql
-- revert/20260615093045_cases_add_evidence_priority.sql
-- Reverses the evidence priority migration.
--
-- WARNING: This drops data. Ensure no upstream queries depend on the
-- priority column before running this down migration.

-- Step 1: Drop index
DROP INDEX IF EXISTS idx_case_evidence_priority;

-- Step 2: Drop column
ALTER TABLE case_evidence DROP COLUMN IF EXISTS priority;

-- Step 3: Remove migration marker
DELETE FROM system_configuration
WHERE config_key = 'migration.cases_add_evidence_priority.applied_at';
```

### Checklist for New Migrations

Every new migration SHALL pass this checklist before being committed:

- [ ] Forward migration is idempotent (safe to re-run)
- [ ] Down migration exists in `revert/` directory
- [ ] Down migration matches forward migration exactly (reverse order)
- [ ] Migration has a header comment describing purpose and domain
- [ ] No destructive operations (DROP TABLE, DELETE) without explicit approval
- [ ] Indexes are created, not assumed
- [ ] Migration has been tested against a fresh database (`supabase db reset`)
- [ ] PR includes both `.sql` files and a description of what changed

---

## Rollback Strategy

### Development Rollback

In local development, the fastest rollback is a full database reset:

```bash
# Wipes the local database and re-applies all migrations from scratch
supabase db reset

# This is equivalent to:
# 1. DROP SCHEMA public CASCADE;
# 2. CREATE SCHEMA public;
# 3. Re-apply all migration files in order
```

### Targeted Rollback

For targeted rollback of specific migrations (useful in staging):

```bash
# Step 1: Check current migration state
supabase migration list

# Step 2: Manually apply the down migration
# Connect to the database and run:
psql "$DATABASE_URL" -f docs/07-DATABASE/migrations/revert/20260615093045_cases_add_evidence_priority.sql

# Step 3: Remove the migration record from supabase_migrations
psql "$DATABASE_URL" -c "
    DELETE FROM supabase_migrations.schema_migrations
    WHERE name = '20260615093045_cases_add_evidence_priority.sql';
"
```

### Production Rollback Protocol

In production, rollbacks follow a strict protocol:

1. **Stop. Assess.** Not all changes can be rolled back (e.g., data migrations that transform values). Check if a forward-fix is safer.
2. **Pre-approval required.** No production rollback without sign-off from the lead engineer and product owner.
3. **Down migration must exist.** If no down migration was written for the forward migration, do not roll back — write a compensating migration instead.
4. **Execute in maintenance window.** Rollbacks that affect table structure require a brief read-only maintenance window.
5. **Verify.** After rollback, run integrity checks and verify application health.

### Compensating Migration (When Rollback Is Not Possible)

If a migration transforms data irreversibly (e.g., merges columns), write a **compensating migration** instead of a down migration:

```sql
-- compensating/20260615093045_restore_legacy_priority.sql
-- Compensating migration: restores the legacy priority field logic
-- by reconstructing it from the new schema, since the original
-- column was dropped.
ALTER TABLE case_evidence
    ADD COLUMN IF NOT EXISTS legacy_priority VARCHAR(20);

-- Reconstruct from relevance_notes heuristic
UPDATE case_evidence
SET legacy_priority = CASE
    WHEN relevance_notes ILIKE '%critical%' THEN 'high'
    WHEN relevance_notes ILIKE '%important%' THEN 'high'
    ELSE 'medium'
END;
```

---

## Migration Inventory

Below is the complete ordered list of all migration files with descriptions. Files are applied in the order listed.

### Phase 1: Core Schema (v1.0)

| # | File | Domain | Description | Tables Created |
|---|------|--------|-------------|----------------|
| 1 | `20260613000001_users_create_users_auth_tables.sql` | Users & Auth | Users, roles, RBAC, sessions, orgs, LE verification | `users`, `roles`, `user_roles`, `role_permissions`, `user_sessions`, `organizations`, `law_enforcement_officer`, `officer_verification` |
| 2 | `20260613000002_profiles_create_criminal_profiles.sql` | Criminal Profiles | Core profile, biometrics, photos, aliases, associates, locations, threat assessments | `criminal_profiles`, `profile_biometrics`, `profile_photos`, `profile_aliases`, `profile_known_associates`, `profile_last_locations`, `profile_threat_assessments` |
| 3 | `20260613000003_cases_create_case_tables.sql` | Cases | Case management, criminal linking, evidence linking, timeline, activity logs, notes | `cases`, `case_criminals`, `case_evidence`, `case_timeline_entries`, `case_activity_logs`, `case_notes` |
| 4 | `20260613000004_evidence_create_evidence_tables.sql` | Evidence | Evidence records, cryptographic chain of custody, tagging | `evidence`, `evidence_chain_of_custody`, `evidence_tags` |
| 5 | `20260613000005_sightings_create_sighting_tables.sql` | Sightings | Sighting reports, media attachments, verification decisions | `sightings`, `sighting_media`, `sighting_verifications` |
| 6 | `20260613000006_alerts_create_alert_tables.sql` | Alerts | Alert records, recipient targeting, delivery tracking | `alerts`, `alert_recipients`, `alert_delivery_logs` |
| 7 | `20260613000007_audit_create_audit_logs.sql` | Audit | Append-only audit trail with monthly partitioning | `audit_logs` + 6 seed partitions |
| 8 | `20260613000008_ai_ml_create_ai_model_tables.sql` | AI / ML | Model version registry, inference results with embeddings | `ai_model_versions`, `ai_inference_results` |
| 9 | `20260613000009_supporting_create_supporting_tables.sql` | Supporting | ALPR records, system configuration store | `alpr_records`, `system_configuration` |
| 10 | `20260613000010_indexes_create_remaining_indexes.sql` | Indexes | All secondary indexes, GIST spatial indexes, pgvector IVFFlat indexes, partial indexes | (indexes only) |
| 11 | `20260613000011_seed_seed_initial_data.sql` | Seed Data | Base roles, system role permissions, default configuration values | (data only) |

### Phase 2: Feature Completion (v1.1)

| # | File | Domain | Description | Tables Created |
|---|------|--------|-------------|----------------|
| 12 | `20260701000001_features_create_entity_intelligence.sql` | Entity Intelligence | Entity profiles, matching, watchlists, tracks, geofences | `entity_profile`, `entity_match`, `watchlist_entry`, `entity_track`, `geofence`, `geofence_violation`, `movement_pattern` |
| 13 | `20260701000002_features_create_media_camera_tables.sql` | Media & Cameras | Media assets, camera registry, monitoring zones, annotations | `media_asset`, `media_metadata`, `media_transcoded_variant`, `camera`, `monitoring_zone`, `media_annotation` |
| 14 | `20260701000003_features_create_edge_tables.sql` | Edge & Infrastructure | Edge nodes, model deployments, health metrics, infra environments | `edge_node`, `edge_model_deployment`, `edge_health_metric`, `infrastructure_environment`, `service_instance` |
| 15 | `20260701000004_features_create_integration_tables.sql` | Integrations | External system connections, webhooks, API keys, integration logging | `external_integration`, `webhook_config`, `api_key`, `integration_export_log`, `integration_import_log` |
| 16 | `20260701000005_features_create_reconstruction_tables.sql` | 3D Reconstruction | Reconstruction projects, 3D assets, evidence markers, scene measurements | `reconstruction_project`, `reconstruction_asset`, `evidence_marker`, `scene_measurement`, `source_file` |
| 17 | `20260701000006_features_create_system_config_tables.sql` | System & Config | Feature flags, security policies, retention policies, data classification, compliance checks | `feature_flag`, `security_policy`, `retention_policy`, `data_classification`, `compliance_check` |

---

## Integration with `packages/db/`

The existing `packages/db/` package uses **Drizzle ORM** for type-safe queries and previously used Drizzle Kit for migrations. The migration pipeline is being migrated to Supabase native, while Drizzle ORM remains for runtime.

### Current State

```
packages/db/
├── drizzle.config.ts              # Drizzle Kit config (points to ./src/migrations)
├── package.json                   # Scripts for db:push, db:generate, db:migrate
├── supabase/
│   └── config.toml                # Supabase local dev config (migrations enabled)
├── src/
│   ├── index.ts                   # Re-exports
│   ├── schema/
│   │   ├── index.ts               # Barrel exports
│   │   └── auth.ts                # Drizzle schema for auth tables
│   └── migrations/
│       ├── 0001_initial_schema.sql     # Drizzle-generated migration (legacy)
│       └── 0002_domain_completion.sql  # Drizzle-generated migration (legacy)
```

### Migration Plan: Drizzle → Supabase

#### Step 1: Update `drizzle.config.ts`

```typescript
// packages/db/drizzle.config.ts
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  schema: "./src/schema",
  // Change: out should point to a Drizzle-specific directory
  // Supabase migrations live in docs/07-DATABASE/migrations/ instead
  out: "./src/migrations/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  // Optional: suppress Drizzle's migration table creation
  // since Supabase manages the migration tracking
});
```

The key change: Drizzle-generated migrations go to `./src/migrations/drizzle/` (for reference/debugging only), while the actual applied migrations live in `docs/07-DATABASE/migrations/`.

#### Step 2: Update `package.json` Scripts

```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:studio": "drizzle-kit studio",
    "db:migrate": "drizzle-kit migrate",

    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:status": "supabase status",
    "supabase:migration:new": "supabase migration new",
    "supabase:migration:list": "supabase migration list",
    "supabase:db:push": "supabase db push",
    "supabase:db:reset": "supabase db reset",
    "supabase:db:diff": "supabase db diff --linked"
  }
}
```

#### Step 3: Configure Supabase Migration Directory

Update the `supabase/config.toml` to reference the shared migrations directory:

```toml
# packages/db/supabase/config.toml
[db.migrations]
enabled = true
# Point to the shared migrations directory
schema_paths = ["../../docs/07-DATABASE/migrations"]
```

Alternatively, use a **symlink** so Supabase CLI can find migrations in its default location:

```bash
# From packages/db/supabase/
ln -s ../../docs/07-DATABASE/migrations migrations
```

This creates: `packages/db/supabase/migrations/` → `docs/07-DATABASE/migrations/`

#### Step 4: Retire Drizzle-Generated Migrations

The existing Drizzle migrations (`0001_initial_schema.sql`, `0002_domain_completion.sql`) are **superseded** by the new Supabase-native migrations. They should be:

1. **Archived** — moved to `packages/db/src/migrations/archive/` for reference
2. **Not deleted** — they document the schema evolution history
3. **Not applied** — the new Supabase migrations replace them entirely

For environments with the old schema already applied, write a **baseline migration** that records the old migrations as already applied:

```sql
-- 20260601000000_baseline_legacy_migrations.sql
-- Records existing legacy migrations as applied so Supabase
-- skips them and only runs new migrations going forward.
INSERT INTO supabase_migrations.schema_migrations (version, name, applied_at)
VALUES
    ('20260601000000', '20260601000000_baseline_legacy_migrations.sql', NOW())
ON CONFLICT (name) DO NOTHING;
```

### Final Directory State

```
packages/db/
├── drizzle.config.ts              # Updated — out points to ./src/migrations/drizzle
├── package.json                   # Updated — added supabase:* scripts
├── supabase/
│   ├── config.toml                # Updated — schema_paths points to docs/07-DATABASE/migrations
│   └── migrations -> ../../docs/07-DATABASE/migrations  # Symlink (optional)
├── src/
│   ├── index.ts
│   ├── schema/
│   │   ├── index.ts
│   │   └── auth.ts
│   └── migrations/
│       ├── archive/
│       │   ├── 0001_initial_schema.sql      # Archived
│       │   └── 0002_domain_completion.sql   # Archived
│       └── drizzle/                          # Future Drizzle-generated refs (optional)
```

### Workflow Summary

| Task | Before (Drizzle) | After (Supabase Native) |
|------|------------------|------------------------|
| Create new table | Edit `schema/*.ts` → `drizzle-kit generate` → `drizzle-kit migrate` | Write SQL migration file → `supabase db push` |
| Apply to local | `drizzle-kit migrate` | `supabase db push` |
| Apply to prod | `drizzle-kit migrate` with prod URL | `supabase db push --db-url "$PROD_URL"` |
| Review pending | Check `src/migrations/` | `supabase migration list` |
| Rollback | Manual SQL | Apply revert file + delete from `schema_migrations` |
| Type-safe queries | `drizzle-orm` (unchanged) | `drizzle-orm` (unchanged) |
| Schema as source of truth | TypeScript schema files | SQL migration files |

---

## Troubleshooting

### Migration fails with "relation already exists"

The migration is not idempotent. Use `IF NOT EXISTS`:

```sql
-- Bad:
CREATE TABLE users ( ... );

-- Good:
CREATE TABLE IF NOT EXISTS users ( ... );
```

### Migration fails with "column already exists"

Add `IF NOT EXISTS` to `ADD COLUMN`:

```sql
-- Bad:
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- Good:
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
```

### `supabase db push` cannot find migration files

Ensure the migration directory is configured correctly:

```bash
# Check current migration path
supabase config show | grep schema_paths

# Ensure symlink exists (if using symlink approach)
ls -la packages/db/supabase/migrations
```

### Migration was applied but needs to be re-run

```bash
# Remove the migration record and re-apply
psql "$DATABASE_URL" -c "
    DELETE FROM supabase_migrations.schema_migrations
    WHERE name = '20260615093045_cases_add_evidence_priority.sql';
"
supabase db push
```

### "Permission denied" when applying migrations

Ensure you are using the `service_role` key or a database user with sufficient privileges:

```bash
# Use the postgres role directly (most permissions)
supabase db push --db-url "postgresql://postgres:$PASSWORD@$HOST:$PORT/postgres"
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Technical Writer | Initial migration guide |
