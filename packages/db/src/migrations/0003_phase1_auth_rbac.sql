-- Phase 1: Auth & RBAC schema extensions

-- Add organization table
CREATE TABLE IF NOT EXISTS organization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  type varchar(50) NOT NULL,
  contact_email varchar(255),
  contact_phone varchar(20),
  address jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Extend user table with Sentinel360-specific fields
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS first_name varchar(100);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_name varchar(100);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone_number varchar(20);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_login_ip varchar(45);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organization(id);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS requires_2fa boolean NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS totp_secret varchar(64);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add is_system to role table
ALTER TABLE "role" ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- Seed default roles
INSERT INTO "role" (code, name, description, is_system) VALUES
  ('super_admin', 'Super Admin', 'Full system access', true),
  ('admin', 'Admin', 'Administrative access', true),
  ('security_operator', 'Security Operator', 'Monitoring and investigation access', true),
  ('investigator', 'Investigator', 'Case investigation access', true),
  ('law_enforcement', 'Law Enforcement', 'Law enforcement officer access', true),
  ('community', 'Community Member', 'Basic community access', true)
ON CONFLICT (code) DO NOTHING;

-- Seed common permissions
INSERT INTO "permission" (code, name, description) VALUES
  ('users:read', 'Read Users', 'View user profiles and lists'),
  ('users:create', 'Create Users', 'Create new user accounts'),
  ('users:update', 'Update Users', 'Update user profiles'),
  ('users:delete', 'Delete Users', 'Deactivate or delete users'),
  ('roles:read', 'Read Roles', 'View roles and permissions'),
  ('roles:create', 'Create Roles', 'Create new roles'),
  ('roles:update', 'Update Roles', 'Update role permissions'),
  ('roles:delete', 'Delete Roles', 'Delete roles'),
  ('organizations:read', 'Read Organizations', 'View organization details'),
  ('organizations:create', 'Create Organizations', 'Create new organizations'),
  ('organizations:update', 'Update Organizations', 'Update organization details'),
  ('organizations:delete', 'Delete Organizations', 'Deactivate organizations'),
  ('cases:read', 'Read Cases', 'View case details'),
  ('cases:create', 'Create Cases', 'Create new cases'),
  ('cases:update', 'Update Cases', 'Update case details'),
  ('cases:delete', 'Delete Cases', 'Delete cases'),
  ('evidence:read', 'Read Evidence', 'View evidence'),
  ('evidence:create', 'Create Evidence', 'Upload and create evidence'),
  ('evidence:update', 'Update Evidence', 'Update evidence metadata'),
  ('evidence:delete', 'Delete Evidence', 'Delete evidence'),
  ('alerts:read', 'Read Alerts', 'View alerts'),
  ('alerts:manage', 'Manage Alerts', 'Acknowledge and manage alerts'),
  ('sightings:read', 'Read Sightings', 'View community sightings'),
  ('sightings:moderate', 'Moderate Sightings', 'Moderate community sighting reports'),
  ('audit:read', 'Read Audit Logs', 'View audit log entries')
ON CONFLICT (code) DO NOTHING;

-- Seed super_admin role with all permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

-- Seed admin role with most permissions (excluding delete)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'admin'
  AND p.code NOT LIKE '%:delete'
  AND p.code NOT LIKE 'audit:%'
ON CONFLICT DO NOTHING;

-- Seed security_operator role with operational permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'security_operator'
  AND p.code IN ('cases:read', 'cases:create', 'cases:update', 'evidence:read', 'evidence:create', 'alerts:read', 'alerts:manage', 'sightings:read')
ON CONFLICT DO NOTHING;

-- Seed investigator role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'investigator'
  AND p.code IN ('cases:read', 'cases:update', 'evidence:read', 'evidence:create', 'sightings:read')
ON CONFLICT DO NOTHING;

-- Seed law_enforcement role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'law_enforcement'
  AND p.code IN ('cases:read', 'evidence:read', 'alerts:read', 'sightings:read')
ON CONFLICT DO NOTHING;
