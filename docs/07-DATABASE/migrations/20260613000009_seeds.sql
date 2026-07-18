-- ============================================================================
-- Migration: 20260613000009_seeds.sql
-- Purpose:  Seed data for roles, permissions, classification levels, system
--           configuration, feature flags, retention policies, and security
--           policies — all idempotent via INSERT ... ON CONFLICT DO NOTHING
-- Domain:   Initialization & Bootstrap
-- Applied:  2026-06-13
-- ============================================================================

-- ── System Roles ─────────────────────────────────────────────────────────────
-- Idempotent — will skip if code already exists (seeded in 03_rbac.sql)
INSERT INTO "role" (code, name, description, is_system) VALUES
  ('community',   'Community Member',     'Community member with basic access',           true),
  ('security',    'Security Operator',    'Security company operator for monitoring',      true),
  ('leo',         'Law Enforcement Officer', 'Law enforcement officer with investigative access', true),
  ('admin',       'Administrator',        'System administrator with management access',   true),
  ('super_admin', 'Super Administrator',  'Super administrator with unrestricted access',  true)
ON CONFLICT (code) DO NOTHING;

-- ── Core Permissions ─────────────────────────────────────────────────────────
-- Each permission has a unique code: {resource}.{action}
-- Actions: create, read, update, delete, verify, approve, export

-- Community permissions (basic read + own-data write)
INSERT INTO "permission" (code, name, description, resource, action) VALUES
  ('sighting.create',      'Create Sighting',      'Submit a new sighting report',              'sightings', 'create'),
  ('sighting.read',        'Read Sighting',        'View own and public sighting reports',      'sightings', 'read'),
  ('sighting.update',      'Update Sighting',      'Update own pending sighting reports',       'sightings', 'update'),
  ('profile.read_public',  'Read Public Profile',  'View public criminal profiles',             'profiles',  'read'),
  ('alert.read',           'Read Alert',           'View alerts targeted to community role',     'alerts',    'read'),
  ('media.create',         'Create Media',         'Upload media attachments to sightings',     'media',     'create'),
  ('media.read',           'Read Media',           'View public media content',                 'media',     'read')
ON CONFLICT (code) DO NOTHING;

-- Security Operator permissions (broader read/write on sightings, evidence)
INSERT INTO "permission" (code, name, description, resource, action) VALUES
  ('case.read',            'Read Case',            'View assigned case details',                'cases',     'read'),
  ('evidence.create',      'Create Evidence',      'Upload and tag new evidence',               'evidence',  'create'),
  ('evidence.read',        'Read Evidence',        'View evidence details and metadata',        'evidence',  'read'),
  ('evidence.update',      'Update Evidence',      'Update evidence metadata and status',       'evidence',  'update'),
  ('profile.read',         'Read Profile',         'View criminal profile details',             'profiles',  'read'),
  ('sighting.verify',      'Verify Sighting',      'Verify or flag community sightings',        'sightings', 'verify'),
  ('alert.read',           'Read Alert',           'View alerts targeted to security role',     'alerts',    'read'),
  ('alert.update',         'Update Alert',         'Acknowledge and update alert status',       'alerts',    'update'),
  ('camera.read',          'Read Camera',          'View camera registry and status',           'cameras',   'read'),
  ('media.create',         'Create Media',         'Upload evidence media',                     'media',     'create'),
  ('media.read',           'Read Media',           'View media content',                        'media',     'read'),
  ('integrations.read',    'Read Integrations',    'View integration configurations',           'integrations', 'read')
ON CONFLICT (code) DO NOTHING;

-- LEO permissions (full CRUD on cases, evidence, profiles, verification)
INSERT INTO "permission" (code, name, description, resource, action) VALUES
  ('case.create',          'Create Case',          'Create new case dockets',                   'cases',     'create'),
  ('case.read',            'Read Case',            'View all case details',                     'cases',     'read'),
  ('case.update',          'Update Case',          'Update case details and status',            'cases',     'update'),
  ('case.delete',          'Delete Case',          'Soft-delete cases',                         'cases',     'delete'),
  ('case.verify',          'Verify Case',          'Verify case findings and close',            'cases',     'verify'),
  ('case.export',          'Export Case',          'Export case data for sharing',              'cases',     'export'),
  ('evidence.create',      'Create Evidence',      'Create and admit evidence',                 'evidence',  'create'),
  ('evidence.read',        'Read Evidence',        'View all evidence and chain of custody',    'evidence',  'read'),
  ('evidence.update',      'Update Evidence',      'Update evidence status and metadata',       'evidence',  'update'),
  ('evidence.verify',      'Verify Evidence',      'Verify evidence authenticity',              'evidence',  'verify'),
  ('evidence.export',      'Export Evidence',      'Export evidence for external sharing',      'evidence',  'export'),
  ('profile.create',       'Create Profile',       'Create new criminal profiles',              'profiles',  'create'),
  ('profile.read',         'Read Profile',         'View all criminal profile details',         'profiles',  'read'),
  ('profile.update',       'Update Profile',       'Update criminal profile information',       'profiles',  'update'),
  ('profile.verify',       'Verify Profile',       'Verify profile identity and details',       'profiles',  'verify'),
  ('profile.export',       'Export Profile',       'Export profile data for inter-agency use',  'profiles',  'export'),
  ('sighting.create',      'Create Sighting',      'Create official sighting records',          'sightings', 'create'),
  ('sighting.read',        'Read Sighting',        'View all sighting reports',                 'sightings', 'read'),
  ('sighting.update',      'Update Sighting',      'Update sighting status and assignments',    'sightings', 'update'),
  ('sighting.verify',      'Verify Sighting',      'Verify and close out sighting reports',     'sightings', 'verify'),
  ('alert.create',         'Create Alert',         'Issue new alerts',                          'alerts',    'create'),
  ('alert.read',           'Read Alert',           'View all alerts',                           'alerts',    'read'),
  ('alert.update',         'Update Alert',         'Update alert severity and targeting',       'alerts',    'update'),
  ('alert.verify',         'Verify Alert',         'Verify alert accuracy and resolve',          'alerts',    'verify'),
  ('camera.read',          'Read Camera',          'View camera registry and feeds',            'cameras',   'read'),
  ('media.read',           'Read Media',           'View all media content',                    'media',     'read'),
  ('media.create',         'Create Media',         'Upload case-related media',                 'media',     'create'),
  ('audit_log.read',       'Read Audit Log',       'View audit log entries',                    'audit_logs','read'),
  ('integrations.read',    'Read Integrations',    'View external integration data',            'integrations', 'read')
ON CONFLICT (code) DO NOTHING;

-- Admin permissions (full CRUD on users, system management)
INSERT INTO "permission" (code, name, description, resource, action) VALUES
  ('user.create',          'Create User',          'Create new user accounts',                  'users',     'create'),
  ('user.read',            'Read User',            'View all user profiles',                    'users',     'read'),
  ('user.update',          'Update User',          'Update user roles and permissions',         'users',     'update'),
  ('user.delete',          'Delete User',          'Soft-delete user accounts',                 'users',     'delete'),
  ('case.approve',         'Approve Case',         'Approve case closures and decisions',       'cases',     'approve'),
  ('evidence.approve',     'Approve Evidence',     'Approve evidence admission',                'evidence',  'approve'),
  ('evidence.delete',      'Delete Evidence',      'Soft-delete evidence records',              'evidence',  'delete'),
  ('profile.approve',      'Approve Profile',      'Approve profile merges and status changes', 'profiles',  'approve'),
  ('profile.delete',       'Delete Profile',       'Soft-delete criminal profiles',             'profiles',  'delete'),
  ('alert.delete',         'Delete Alert',         'Soft-delete alerts',                        'alerts',    'delete'),
  ('alert.approve',        'Approve Alert',        'Approve alert escalation and broadcast',    'alerts',    'approve'),
  ('camera.create',        'Create Camera',        'Register new cameras',                      'cameras',   'create'),
  ('camera.update',        'Update Camera',        'Update camera configuration',               'cameras',   'update'),
  ('camera.delete',        'Delete Camera',        'Soft-delete cameras',                       'cameras',   'delete'),
  ('media.update',         'Update Media',         'Update media metadata and retention',       'media',     'update'),
  ('media.delete',         'Delete Media',         'Soft-delete media assets',                  'media',     'delete'),
  ('audit_log.read',       'Read Audit Log',       'View and export audit logs',                'audit_logs','read'),
  ('integrations.create',  'Create Integration',   'Set up new external integrations',          'integrations', 'create'),
  ('integrations.update',  'Update Integration',   'Modify integration configurations',         'integrations', 'update'),
  ('integrations.delete',  'Delete Integration',   'Remove external integrations',              'integrations', 'delete'),
  ('integrations.export',  'Export Integration',   'Export data through integrations',          'integrations', 'export')
ON CONFLICT (code) DO NOTHING;

-- Super Admin permissions (full access to everything — all actions)
INSERT INTO "permission" (code, name, description, resource, action) VALUES
  ('user.approve',         'Approve User',         'Approve user verification and escalation',  'users',     'approve'),
  ('user.export',          'Export User',          'Bulk export user data',                     'users',     'export'),
  ('audit_log.export',     'Export Audit Log',     'Export audit logs for compliance',          'audit_logs','export'),
  ('audit_log.delete',     'Delete Audit Log',     'Purge audit log partitions',                'audit_logs','delete'),
  ('integrations.verify',  'Verify Integration',   'Verify integration connectivity',           'integrations', 'verify'),
  ('integrations.approve', 'Approve Integration',  'Approve integration data sharing',          'integrations', 'approve'),
  ('cameras.export',       'Export Cameras',       'Bulk export camera registry',               'cameras',   'export'),
  ('media.export',         'Export Media',         'Bulk export media assets',                  'media',     'export'),
  ('sightings.export',     'Export Sightings',     'Bulk export sighting reports',              'sightings', 'export'),
  ('alert.export',         'Export Alert',         'Bulk export alert records',                 'alerts',    'export'),
  ('case.approve',         'Approve Case',         'Approve all case operations',               'cases',     'approve')
ON CONFLICT (code) DO NOTHING;

-- ── Role-Permission Assignments ──────────────────────────────────────────────
-- Map roles to their permission sets using the permission codes

-- Community role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'community'
  AND p.code IN (
    'sighting.create', 'sighting.read', 'sighting.update',
    'profile.read_public',
    'alert.read',
    'media.create', 'media.read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Security Operator role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'security'
  AND p.code IN (
    'case.read',
    'evidence.create', 'evidence.read', 'evidence.update',
    'profile.read',
    'sighting.create', 'sighting.read', 'sighting.update', 'sighting.verify',
    'alert.read', 'alert.update',
    'camera.read',
    'media.create', 'media.read',
    'integrations.read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Law Enforcement Officer role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'leo'
  AND p.code IN (
    'case.create', 'case.read', 'case.update', 'case.delete', 'case.verify', 'case.export',
    'evidence.create', 'evidence.read', 'evidence.update', 'evidence.verify', 'evidence.export',
    'profile.create', 'profile.read', 'profile.update', 'profile.verify', 'profile.export',
    'sighting.create', 'sighting.read', 'sighting.update', 'sighting.verify',
    'alert.create', 'alert.read', 'alert.update', 'alert.verify',
    'camera.read',
    'media.create', 'media.read',
    'audit_log.read',
    'integrations.read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Administrator role (includes all LEO + admin-level actions)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'admin'
  AND p.code IN (
    'case.create', 'case.read', 'case.update', 'case.delete', 'case.verify', 'case.export', 'case.approve',
    'evidence.create', 'evidence.read', 'evidence.update', 'evidence.delete', 'evidence.verify', 'evidence.approve', 'evidence.export',
    'profile.create', 'profile.read', 'profile.update', 'profile.delete', 'profile.verify', 'profile.approve', 'profile.export',
    'sighting.create', 'sighting.read', 'sighting.update', 'sighting.verify', 'sightings.export',
    'alert.create', 'alert.read', 'alert.update', 'alert.delete', 'alert.verify', 'alert.approve', 'alert.export',
    'user.create', 'user.read', 'user.update', 'user.delete',
    'camera.create', 'camera.read', 'camera.update', 'camera.delete', 'cameras.export',
    'media.create', 'media.read', 'media.update', 'media.delete', 'media.export',
    'audit_log.read',
    'integrations.create', 'integrations.read', 'integrations.update', 'integrations.delete', 'integrations.export'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Super Administrator role (every permission in the system)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── Data Classification Levels ───────────────────────────────────────────────
-- Idempotent — will skip if level already exists (seeded in 03_rbac.sql)
INSERT INTO data_classification (level, rank, description, allowed_roles) VALUES
  ('public',      1, 'Public information, visible to all users',           ARRAY['community', 'security', 'leo', 'admin', 'super_admin']),
  ('internal',    2, 'Internal use, visible to authenticated users',       ARRAY['security', 'leo', 'admin', 'super_admin']),
  ('restricted',  3, 'Restricted access, law enforcement and above',       ARRAY['leo', 'admin', 'super_admin']),
  ('confidential',4, 'Confidential, sensitive case data',                  ARRAY['leo', 'admin', 'super_admin']),
  ('top_secret',  5, 'Top secret, limited to super administrators only',   ARRAY['super_admin'])
ON CONFLICT (level) DO NOTHING;

-- ── System Configuration ─────────────────────────────────────────────────────
-- Idempotent — will skip if config_key already exists (seeded in 03_rbac.sql)
INSERT INTO system_configuration (config_key, config_value, description) VALUES
  ('alert.default_confidence_threshold', '{"value": 80}',     'Default minimum confidence % for automatic alerts'),
  ('sighting.auto_match_enabled',        '{"value": true}',   'Enable automatic AI matching of sightings to profiles'),
  ('evidence.hash_algorithm',            '{"value": "SHA-256"}', 'Cryptographic hash algorithm for evidence chain of custody'),
  ('auth.max_failed_attempts',           '{"value": 5}',      'Maximum failed login attempts before account lockout'),
  ('auth.lockout_duration_minutes',      '{"value": 30}',     'Account lockout duration after max failed attempts'),
  ('pagination.default_page_size',       '{"value": 20}',     'Default number of records per page'),
  ('pagination.max_page_size',           '{"value": 100}',    'Maximum allowed records per page')
ON CONFLICT (config_key) DO NOTHING;

-- ── Feature Flags ────────────────────────────────────────────────────────────

INSERT INTO feature_flag (name, description, is_enabled) VALUES
  ('community_sightings',         'Allow community members to submit sighting reports',              true),
  ('ai_auto_matching',            'Automatically match new sightings against criminal profiles via AI', true),
  ('public_wanted_feed',          'Display a public feed of wanted persons and active alerts',        true),
  ('evidence_chain_of_custody',   'Enforce cryptographic chain of custody for all evidence records',  true),
  ('3d_reconstruction',           'Enable 3D crime scene reconstruction and measurement tools',       false)
ON CONFLICT (name) DO NOTHING;

-- ── Retention Policies ───────────────────────────────────────────────────────

INSERT INTO retention_policy (policy_name, retention_days, archive_days, deletion_days, applies_to_categories) VALUES
  ('raw_video_retention',      90,  180, 365,  '["video/mp4", "video/x-h264", "raw_camera_footage"]'),
  ('evidence_permanent',       NULL, NULL, NULL, '["evidence"]'),
  ('audit_log_retention',      365,  NULL, 730, '["audit_log"]'),
  ('community_sighting_retention', 730, NULL, 1095, '["community_sighting", "sighting_media"]')
ON CONFLICT (policy_name) DO NOTHING;

-- ── Security Policies ────────────────────────────────────────────────────────

INSERT INTO security_policy (policy_name, policy_config) VALUES
  ('password_policy',
   '{"password_min_length": 8, "password_require_special": true, "password_require_upper": true, "password_require_lower": true, "password_require_digit": true}'::jsonb),
  ('session_policy',
   '{"session_timeout_minutes": 60, "max_concurrent_sessions": 5, "require_email_verification": true}'::jsonb),
  ('account_lockout_policy',
   '{"max_failed_attempts": 5, "lockout_duration_minutes": 30, "lockout_attempt_window_minutes": 15}'::jsonb),
  ('mfa_policy',
   '{"require_mfa_for_roles": ["admin", "super_admin", "leo"], "totp_enabled": true, "recovery_codes_count": 8}'::jsonb),
  ('api_security_policy',
   '{"rate_limit_per_minute": 60, "rate_limit_per_hour": 1000, "require_api_key": true, "key_expiry_days": 90}'::jsonb)
ON CONFLICT (policy_name) DO NOTHING;
