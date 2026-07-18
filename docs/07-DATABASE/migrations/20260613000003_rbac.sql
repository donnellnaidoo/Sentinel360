-- ============================================================================
-- Migration: 20260613000003_rbac.sql
-- Purpose:  Role-based access control, permissions, data classification,
--           law enforcement verification, and system configuration
-- Domain:   Authorization & Governance
-- Applied:  2026-06-13
-- ============================================================================

-- ── Roles ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "role" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  is_system         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed system roles (idempotent — will skip if already present)
INSERT INTO "role" (code, name, description, is_system) VALUES
  ('community', 'Community Member', 'Community member with basic access', true),
  ('security', 'Security Operator', 'Security company operator', true),
  ('leo', 'Law Enforcement Officer', 'Law enforcement officer with investigative access', true),
  ('admin', 'Administrator', 'System administrator', true),
  ('super_admin', 'Super Administrator', 'Super administrator with full access', true)
ON CONFLICT (code) DO NOTHING;

-- ── Permissions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "permission" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  resource          TEXT NOT NULL,
  action            TEXT NOT NULL,
  conditions        JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource, action)
);

-- ── User-Role assignments ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_role (
  user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role_id           UUID NOT NULL REFERENCES "role"(id) ON DELETE CASCADE,
  assigned_by       TEXT REFERENCES "user"(id),
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at        TIMESTAMPTZ,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_active ON user_role(user_id) WHERE revoked_at IS NULL;

-- ── Role-Permission grants ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_permission (
  role_id           UUID NOT NULL REFERENCES "role"(id) ON DELETE CASCADE,
  permission_id     UUID NOT NULL REFERENCES "permission"(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ── Data Classification ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_classification (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level                     TEXT NOT NULL UNIQUE,
  rank                      INTEGER NOT NULL UNIQUE,
  description               TEXT,
  allowed_roles             TEXT[] NOT NULL DEFAULT '{}',
  handling_requirements     JSONB NOT NULL DEFAULT '{}'::jsonb,
  retention_override_days   INTEGER,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default classification levels
INSERT INTO data_classification (level, rank, description, allowed_roles) VALUES
  ('public',      0, 'Public information, visible to all users',           ARRAY['community', 'security', 'leo', 'admin', 'super_admin']),
  ('internal',    1, 'Internal use, visible to authenticated users',       ARRAY['security', 'leo', 'admin', 'super_admin']),
  ('restricted',  2, 'Restricted access, law enforcement and above',       ARRAY['leo', 'admin', 'super_admin']),
  ('confidential',3, 'Confidential, sensitive case data',                  ARRAY['leo', 'admin', 'super_admin']),
  ('classified',  4, 'Classified, limited to senior investigators',        ARRAY['admin', 'super_admin'])
ON CONFLICT (level) DO NOTHING;

-- ── Law Enforcement Officer profiles ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS law_enforcement_officer (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  badge_number        TEXT NOT NULL UNIQUE,
  department          TEXT,
  jurisdiction        TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING',
  clearance_level     TEXT NOT NULL DEFAULT 'STANDARD',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS officer_verification (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  verifier_user_id      TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  verification_status   TEXT NOT NULL,
  notes                 TEXT,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_officer_verification_officer ON officer_verification(officer_user_id);
CREATE INDEX IF NOT EXISTS idx_leo_verification_status ON law_enforcement_officer(verification_status);
CREATE INDEX IF NOT EXISTS idx_leo_department ON law_enforcement_officer(department);

-- ── System Settings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_setting (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key               TEXT NOT NULL UNIQUE,
  setting_value             JSONB NOT NULL DEFAULT '{}'::jsonb,
  setting_type              TEXT NOT NULL DEFAULT 'json',
  last_modified_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_configuration (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key        TEXT NOT NULL UNIQUE,
  config_value      JSONB NOT NULL,
  description       TEXT,
  is_encrypted      BOOLEAN NOT NULL DEFAULT false,
  updated_by        TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial configurations
INSERT INTO system_configuration (config_key, config_value, description) VALUES
  ('alert.default_confidence_threshold', '{"value": 80}',     'Default minimum confidence % for automatic alerts'),
  ('sighting.auto_match_enabled',        '{"value": true}',   'Enable automatic AI matching of sightings to profiles'),
  ('evidence.hash_algorithm',            '{"value": "SHA-256"}', 'Cryptographic hash algorithm for evidence chain'),
  ('auth.max_failed_attempts',           '{"value": 5}',      'Max failed login attempts before account lockout'),
  ('auth.lockout_duration_minutes',      '{"value": 30}',     'Account lockout duration after failed attempts'),
  ('pagination.default_page_size',       '{"value": 20}',     'Default records per page'),
  ('pagination.max_page_size',           '{"value": 100}',    'Maximum records per page'),
  ('video.processing_resolution',        '{"value": "1080p"}','Video processing resolution'),
  ('video.keyframe_interval_seconds',    '{"value": 2}',      'Interval between AI analysis frames')
ON CONFLICT (config_key) DO NOTHING;

-- ── Security & Retention Policies ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS security_policy (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name         TEXT NOT NULL UNIQUE,
  policy_config       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retention_policy (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name           TEXT NOT NULL UNIQUE,
  retention_days        INTEGER NOT NULL,
  archive_days          INTEGER,
  deletion_days         INTEGER,
  applies_to_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Feature Flags ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flag (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL UNIQUE,
  description         TEXT,
  is_enabled          BOOLEAN NOT NULL DEFAULT false,
  dependencies        JSONB NOT NULL DEFAULT '[]'::jsonb,
  rollout_percentage  NUMERIC(10,4),
  updated_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feature_flag_rollout_ck CHECK (rollout_percentage IS NULL OR (rollout_percentage >= 0 AND rollout_percentage <= 1))
);

CREATE INDEX IF NOT EXISTS idx_feature_flag_enabled ON feature_flag(name) WHERE is_enabled = TRUE;
