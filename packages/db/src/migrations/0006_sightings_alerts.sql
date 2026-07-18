-- Sightings & Alerts domains. The `community_sighting`, `alert`,
-- `alert_acknowledgment`, and `notification` tables were already
-- provisioned directly on the database ahead of this repo's Drizzle
-- schema/migrations (see packages/db/src/schema/sightings.ts and alerts.ts
-- for the introspected column layout) — there is nothing to create here.
--
-- 06-sightings-domain.md UC-03: "Only Law Enforcement and Admin roles can
-- verify sightings." Admin already has sightings:moderate via the blanket
-- admin grant in 0003; law_enforcement was missing it.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r, "permission" p
WHERE r.code = 'law_enforcement'
  AND p.code = 'sightings:moderate'
ON CONFLICT DO NOTHING;
