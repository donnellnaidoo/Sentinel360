-- ============================================================================
-- Migration: 20260613000007_sightings.sql
-- Purpose:  Community and surveillance sightings, media attachments,
--           verifications, anonymous tips, feeds, comments, and moderation
-- Domain:   Sightings & Community Intelligence
-- Applied:  2026-06-13
-- ============================================================================

-- ── Sightings (community-submitted reports of wanted/observed persons) ─────

CREATE TABLE IF NOT EXISTS sighting (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID REFERENCES criminal_profile(id),
  submitted_by          UUID NOT NULL REFERENCES "user"(id),
  anonymous_submission  BOOLEAN NOT NULL DEFAULT false,

  -- Content
  description           TEXT NOT NULL,
  location              GEOGRAPHY(POINT, 4326) NOT NULL,
  location_address      TEXT,
  location_accuracy_meters DECIMAL(10,2),
  observed_at           TIMESTAMPTZ NOT NULL,

  -- Status
  status                TEXT NOT NULL DEFAULT 'pending',     -- pending, under_review, verified, duplicate, false_report, actioned
  status_changed_at     TIMESTAMPTZ,
  status_changed_by     UUID REFERENCES "user"(id),

  -- AI Matching
  ai_match_processed    BOOLEAN NOT NULL DEFAULT false,
  ai_match_profile_id   UUID REFERENCES criminal_profile(id),
  ai_confidence_score   DECIMAL(5,2),
  ai_model_version_id   UUID,                               -- FK to ai_model_versions
  ai_processed_at       TIMESTAMPTZ,

  -- Verification
  verified_by           UUID REFERENCES "user"(id),
  verified_at           TIMESTAMPTZ,
  verification_notes    TEXT,

  -- Reference
  reference_number      TEXT NOT NULL UNIQUE,
  is_public             BOOLEAN NOT NULL DEFAULT false,
  sighting_type         TEXT,                               -- wanted_person, suspicious_activity, vehicle, other
  severity              TEXT,
  operator_notes        TEXT,

  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sighting_status ON sighting(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sighting_submitter ON sighting(submitted_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sighting_profile ON sighting(profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sighting_geo ON sighting USING GIST(location) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sighting_observed ON sighting(observed_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sighting_reference ON sighting(reference_number);
CREATE INDEX IF NOT EXISTS idx_sighting_ai_match ON sighting(ai_match_processed, ai_confidence_score) WHERE ai_match_processed = TRUE;

-- ── Community Sightings (legacy community sighting reports) ─────────────────

CREATE TABLE IF NOT EXISTS community_sighting (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code        TEXT NOT NULL UNIQUE,
  reporter_user_id      TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  sighting_type         TEXT NOT NULL,
  title                 TEXT,
  description           TEXT NOT NULL,
  location              JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at           TIMESTAMPTZ,
  media_ids             JSONB NOT NULL DEFAULT '[]'::jsonb,
  status                TEXT NOT NULL DEFAULT 'SUBMITTED',
  severity              TEXT,
  visibility            TEXT NOT NULL DEFAULT 'PUBLIC',
  operator_notes        TEXT,
  linked_incident_id    UUID REFERENCES incident(id) ON DELETE SET NULL,
  moderation_status     TEXT NOT NULL DEFAULT 'PENDING',
  moderation_reason     TEXT,
  reported_at           TIMESTAMPTZ,
  is_anonymous          BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_sighting_status ON community_sighting(status);
CREATE INDEX IF NOT EXISTS idx_community_sighting_reference ON community_sighting(reference_code);
CREATE INDEX IF NOT EXISTS idx_community_sighting_reporter ON community_sighting(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_community_sighting_moderation ON community_sighting(moderation_status);

-- ── Sighting Media (photos/videos attached to sightings) ────────────────────

CREATE TABLE IF NOT EXISTS sighting_media (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id       UUID NOT NULL REFERENCES sighting(id) ON DELETE CASCADE,
  media_type        TEXT NOT NULL,                          -- image, video
  storage_url       TEXT NOT NULL,
  cdn_url           TEXT,
  file_size_bytes   BIGINT,
  mime_type         TEXT,
  sha256_hash       TEXT NOT NULL,
  is_primary        BOOLEAN NOT NULL DEFAULT false,
  width             INTEGER,
  height            INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sighting_media_sighting ON sighting_media(sighting_id);
CREATE INDEX IF NOT EXISTS idx_sighting_media_primary ON sighting_media(sighting_id, is_primary) WHERE is_primary = TRUE;

-- ── Sighting Verifications (officer/analyst verification decisions) ────────

CREATE TABLE IF NOT EXISTS sighting_verification (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id       UUID NOT NULL REFERENCES sighting(id) ON DELETE CASCADE,
  verified_by       UUID NOT NULL REFERENCES "user"(id),
  decision          TEXT NOT NULL,                           -- verified, duplicate, false_report
  confidence        DECIMAL(5,2),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sighting_id, verified_by)
);

CREATE INDEX IF NOT EXISTS idx_sighting_verification_sighting ON sighting_verification(sighting_id);
CREATE INDEX IF NOT EXISTS idx_sighting_verification_verifier ON sighting_verification(verified_by);

-- ── Anonymous Tips ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS anonymous_tip (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code    TEXT NOT NULL UNIQUE,
  content           TEXT NOT NULL,
  location          JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_ids         JSONB NOT NULL DEFAULT '[]'::jsonb,
  status            TEXT NOT NULL DEFAULT 'SUBMITTED',
  linked_case_id    UUID REFERENCES cases(id) ON DELETE SET NULL,
  review_notes      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anonymous_tip_status ON anonymous_tip(status);
CREATE INDEX IF NOT EXISTS idx_anonymous_tip_reference ON anonymous_tip(reference_code);
CREATE INDEX IF NOT EXISTS idx_anonymous_tip_case ON anonymous_tip(linked_case_id);

-- ── Community Feed Items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_feed_item (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type         TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  location          JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_entity_type TEXT,
  source_entity_id  TEXT,
  media_url         TEXT,
  radius_km         NUMERIC(10,2),
  is_pinned         BOOLEAN NOT NULL DEFAULT false,
  helpful_count     INTEGER NOT NULL DEFAULT 0,
  published_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_feed_type ON community_feed_item(item_type);
CREATE INDEX IF NOT EXISTS idx_community_feed_pinned ON community_feed_item(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_community_feed_published ON community_feed_item(published_at DESC);

-- ── Sighting Comments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sighting_comment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id       UUID NOT NULL REFERENCES sighting(id) ON DELETE CASCADE,
  author_id         TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  comment_text      TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sighting_comment_sighting ON sighting_comment(sighting_id);
CREATE INDEX IF NOT EXISTS idx_sighting_comment_author ON sighting_comment(author_id);

-- ── Community Interactions (likes, flags, shares) ─────────────────────────

CREATE TABLE IF NOT EXISTS community_interaction (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  target_entity_type  TEXT NOT NULL,
  target_entity_id    TEXT NOT NULL,
  interaction_type    TEXT NOT NULL,                         -- like, flag, share, bookmark
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_interaction_user ON community_interaction(user_id);
CREATE INDEX IF NOT EXISTS idx_community_interaction_target ON community_interaction(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_community_interaction_type ON community_interaction(interaction_type);

-- ── Community Preferences ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_preference (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  home_location                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  alert_radius_km                 NUMERIC(10,2) NOT NULL DEFAULT 5,
  privacy_level                   TEXT NOT NULL DEFAULT 'PUBLIC',
  sighting_notifications_enabled  BOOLEAN NOT NULL DEFAULT true,
  feed_notifications_enabled      BOOLEAN NOT NULL DEFAULT true,
  push_alerts_enabled             BOOLEAN NOT NULL DEFAULT true,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Moderation Reviews (for community content) ─────────────────────────────

CREATE TABLE IF NOT EXISTS moderation_review (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_entity_type    TEXT NOT NULL,
  target_entity_id      TEXT NOT NULL,
  moderation_status     TEXT NOT NULL,
  reason                TEXT,
  reviewed_by_user_id   TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_review_entity ON moderation_review(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_moderation_review_status ON moderation_review(moderation_status);

-- ── Surveillance Sightings (AI/monitoring tracked sightings from entity_track) ─

CREATE TABLE IF NOT EXISTS surveillance_sighting (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_track_id   UUID NOT NULL REFERENCES entity_track(id) ON DELETE CASCADE,
  entity_profile_id UUID NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  camera_id         TEXT,
  location          JSONB NOT NULL DEFAULT '{}'::jsonb,
  zone_id           UUID,                                    -- FK to monitoring_zone
  observed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  detection_id      UUID,                                    -- FK to detection
  re_id_confidence  NUMERIC(10,4),
  dwell_duration_seconds INTEGER,
  direction         TEXT,
  speed_estimate_mps NUMERIC(18,6),
  frame_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT surveillance_sighting_reid_confidence_ck CHECK (re_id_confidence IS NULL OR (re_id_confidence >= 0 AND re_id_confidence <= 1))
);

CREATE INDEX IF NOT EXISTS idx_surveillance_sighting_track ON surveillance_sighting(entity_track_id);
CREATE INDEX IF NOT EXISTS idx_surveillance_sighting_entity ON surveillance_sighting(entity_profile_id);
CREATE INDEX IF NOT EXISTS idx_surveillance_sighting_camera ON surveillance_sighting(camera_id);
CREATE INDEX IF NOT EXISTS idx_surveillance_sighting_observed ON surveillance_sighting(observed_at DESC);
