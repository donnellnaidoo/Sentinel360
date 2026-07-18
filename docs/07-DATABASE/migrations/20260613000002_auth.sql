-- ============================================================================
-- Migration: 20260613000002_auth.sql
-- Purpose:  Authentication, user management, and organization tables
-- Domain:   Users & Authentication (better-auth compatible)
-- Applied:  2026-06-13
-- ============================================================================

-- ── better-auth core tables ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user" (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  email_verified    BOOLEAN NOT NULL DEFAULT false,
  image             TEXT,
  role              TEXT NOT NULL DEFAULT 'community',    -- community, security, leo, admin, super_admin
  phone_number      TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_locked         BOOLEAN NOT NULL DEFAULT false,
  locked_until      TIMESTAMPTZ,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  id                TEXT PRIMARY KEY,
  expires_at        TIMESTAMPTZ NOT NULL,
  token             TEXT NOT NULL UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address        TEXT,
  user_agent        TEXT,
  user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  id                      TEXT PRIMARY KEY,
  account_id              TEXT NOT NULL,
  provider_id             TEXT NOT NULL,
  user_id                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token            TEXT,
  refresh_token           TEXT,
  id_token                TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope                   TEXT,
  password                TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
  id                TEXT PRIMARY KEY,
  identifier        TEXT NOT NULL,
  value             TEXT NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- better-auth indexes

CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"(user_id);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification"(identifier);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);

-- ── Organizations table (from architecture schema) ─────────────────────────

CREATE TABLE IF NOT EXISTS organization (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  type              TEXT NOT NULL,                       -- security_company, police_department, community_group
  contact_email     TEXT,
  contact_phone     TEXT,
  address           JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- Add organization_id to user table if not exists (safe, idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE "user" ADD COLUMN organization_id UUID REFERENCES organization(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organization_type ON organization(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organization_name ON organization(name);
CREATE INDEX IF NOT EXISTS idx_user_organization_id ON "user"(organization_id);
