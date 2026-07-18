-- Phase 1 (investigation MVP): permissions for entity/suspect profiles and
-- watchlist entries. cases:*, evidence:*, etc. were seeded in
-- 0003_phase1_auth_rbac.sql; profiles/watchlist were missing entirely.

INSERT INTO "permission" (code, name, description) VALUES
  ('profiles:read', 'Read Profiles', 'View suspect/entity profiles'),
  ('profiles:create', 'Create Profiles', 'Create suspect/entity profiles'),
  ('profiles:update', 'Update Profiles', 'Update suspect/entity profiles'),
  ('profiles:delete', 'Delete Profiles', 'Delete suspect/entity profiles'),
  ('watchlist:read', 'Read Watchlist', 'View watchlist entries'),
  ('watchlist:create', 'Create Watchlist Entries', 'Add profiles to the watchlist'),
  ('watchlist:update', 'Update Watchlist Entries', 'Update watchlist entry status/priority'),
  ('watchlist:delete', 'Delete Watchlist Entries', 'Remove watchlist entries')
ON CONFLICT (code) DO NOTHING;

-- super_admin already receives all permissions via the wildcard grant in
-- 0003 (no code filter); admin already receives all non-:delete,
-- non-audit:% permissions via its wildcard grant. Only the explicit
-- per-role lists below need extending.

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'security_operator'
  AND p.code IN ('profiles:read', 'profiles:create', 'profiles:update', 'watchlist:read', 'watchlist:create')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'investigator'
  AND p.code IN ('profiles:read', 'profiles:update', 'watchlist:read', 'watchlist:create')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'law_enforcement'
  AND p.code IN ('profiles:read', 'watchlist:read')
ON CONFLICT DO NOTHING;
