-- Links community sightings to wanted persons and (via an incident) to
-- cases. A reporter picks the wanted person they saw — never a case — and
-- the server stores the cases that person is tied to as suggestions. A
-- moderator confirms the actual case link at approval time, which creates
-- an incident (community_sighting.linked_incident_id, already present) and
-- a case_incident row.
--
-- community_sighting was provisioned directly on the database ahead of this
-- repo's migrations (see 0006 and packages/db/src/schema/sightings.ts), so
-- this only adds columns; it does not recreate the table.
--
-- Hand-written, not drizzle-kit generate/push — see 0008's header for why.

ALTER TABLE community_sighting
  ADD COLUMN IF NOT EXISTS subject_entity_profile_id uuid
    REFERENCES entity_profile(id) ON DELETE SET NULL;

-- Case ids derived from the subject's active watchlist entries and
-- case_criminal rows at submission time. Suggestions only — nothing is
-- linked until a moderator approves. Never returned to community users.
ALTER TABLE community_sighting
  ADD COLUMN IF NOT EXISTS suggested_case_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 06-sightings-domain.md: "Duplicate sightings must be linked to the
-- original sighting record."
ALTER TABLE community_sighting
  ADD COLUMN IF NOT EXISTS duplicate_of_sighting_id uuid
    REFERENCES community_sighting(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS community_sighting_subject_idx
  ON community_sighting(subject_entity_profile_id)
  WHERE subject_entity_profile_id IS NOT NULL;
