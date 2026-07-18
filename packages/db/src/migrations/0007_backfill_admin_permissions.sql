-- Bug fix: 0003's wildcard grants for super_admin/admin ran once, at that
-- migration's execution time, and only captured the permissions that
-- existed then. 0004 added profiles:*/watchlist:* permissions and backfilled
-- security_operator/investigator/law_enforcement, but never re-ran the
-- super_admin/admin wildcards — so super_admin and admin were silently
-- missing every permission added after 0003 (found via manual testing:
-- admin/profiles and the wanted-feed page 403'd for a super_admin user).
-- This re-applies the same wildcard logic as 0003 so it also picks up
-- anything added since, not just profiles/watchlist specifically.

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'admin'
  AND p.code NOT LIKE '%:delete'
  AND p.code NOT LIKE 'audit:%'
ON CONFLICT DO NOTHING;
