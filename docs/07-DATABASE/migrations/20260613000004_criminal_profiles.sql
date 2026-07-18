-- ============================================================================
-- Migration: 20260613000004_criminal_profiles.sql
-- Purpose:  Criminal/person-of-interest profiles, biometrics, photos,
--           aliases, known associates, last locations, threat assessments,
--           entity tracking, watchlists, and geofences
-- Domain:   Criminal Profiles & Entity Intelligence
-- Applied:  2026-06-13
-- ============================================================================

-- ── Criminal Profiles (central person-of-interest table) ────────────────────

CREATE TABLE IF NOT EXISTS criminal_profile (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id                 TEXT UNIQUE,
  first_name                  TEXT NOT NULL,
  last_name                   TEXT NOT NULL,
  date_of_birth               DATE,
  gender                      TEXT,
  nationality                 TEXT,
  id_number                   TEXT,
  physical_description        JSONB,
  risk_level                  TEXT NOT NULL DEFAULT 'unknown',
  status                      TEXT NOT NULL DEFAULT 'active',
  status_changed_at           TIMESTAMPTZ,
  status_changed_by           UUID REFERENCES "user"(id),
  is_public                   BOOLEAN NOT NULL DEFAULT true,
  is_wanted                   BOOLEAN NOT NULL DEFAULT true,
  last_known_location         GEOGRAPHY(POINT, 4326),
  last_seen_at                TIMESTAMPTZ,
  default_confidence_threshold DECIMAL(5,2) DEFAULT 80.00,
  notes                       TEXT,
  merged_into                 UUID REFERENCES criminal_profile(id),
  created_by                  UUID REFERENCES "user"(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_criminal_profile_status ON criminal_profile(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_criminal_profile_name ON criminal_profile(last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_criminal_profile_public ON criminal_profile(is_public) WHERE is_public = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_criminal_profile_geo ON criminal_profile USING GIST(last_known_location) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_criminal_profile_external ON criminal_profile(external_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_criminal_profile_risk ON criminal_profile(risk_level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_criminal_profile_wanted ON criminal_profile(is_wanted) WHERE is_wanted = TRUE AND deleted_at IS NULL;

-- ── Profile Biometrics (face embeddings, fingerprints, iris, voice) ────────

CREATE TABLE IF NOT EXISTS profile_biometric (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES criminal_profile(id) ON DELETE CASCADE,
  biometric_type    TEXT NOT NULL,                          -- face_embedding, fingerprint_hash, iris_hash, voice_print
  embedding_vector  VECTOR(512),                            -- pgvector for face embeddings
  algorithm         TEXT,                                   -- ArcFace-R100, DeepPrint, etc.
  algorithm_version TEXT,
  quality_score     DECIMAL(5,2),                           -- 0-100 quality metric
  source            TEXT,                                   -- upload, ai_capture, external_import
  is_primary        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, biometric_type, algorithm)
);

CREATE INDEX IF NOT EXISTS idx_profile_biometric_profile ON profile_biometric(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_biometric_embedding ON profile_biometric USING ivfflat (embedding_vector vector_cosine_ops)
  WHERE biometric_type = 'face_embedding';
CREATE INDEX IF NOT EXISTS idx_profile_biometric_type ON profile_biometric(biometric_type);

-- ── Profile Photos ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile_photo (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES criminal_profile(id) ON DELETE CASCADE,
  storage_url       TEXT NOT NULL,
  cdn_url           TEXT,
  photo_type        TEXT NOT NULL,                           -- mugshot, surveillance, uploaded, ai_capture
  is_primary        BOOLEAN NOT NULL DEFAULT false,
  width             INTEGER,
  height            INTEGER,
  file_size_bytes   BIGINT,
  mime_type         TEXT NOT NULL DEFAULT 'image/jpeg',
  sha256_hash       TEXT NOT NULL,
  source            TEXT,
  source_url        TEXT,
  taken_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profile_photo_profile ON profile_photo(profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profile_photo_primary ON profile_photo(profile_id, is_primary) WHERE is_primary = TRUE AND deleted_at IS NULL;

-- ── Profile Aliases (aka, nicknames, street names) ─────────────────────────

CREATE TABLE IF NOT EXISTS profile_alias (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES criminal_profile(id) ON DELETE CASCADE,
  alias             TEXT NOT NULL,
  alias_type        TEXT NOT NULL DEFAULT 'aka',             -- aka, nickname, street_name, former_name
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_alias_profile ON profile_alias(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_alias_alias ON profile_alias(alias);

-- ── Profile Known Associates ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile_known_associate (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL REFERENCES criminal_profile(id) ON DELETE CASCADE,
  associate_id        UUID NOT NULL REFERENCES criminal_profile(id) ON DELETE CASCADE,
  relationship_type   TEXT NOT NULL,                         -- accomplice, family, gang_member, associate
  confidence_score    DECIMAL(5,2),
  source              TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  valid_from          TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to            TIMESTAMPTZ,
  created_by          UUID REFERENCES "user"(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_known_associate_not_self CHECK (profile_id != associate_id),
  UNIQUE(profile_id, associate_id)
);

CREATE INDEX IF NOT EXISTS idx_known_associate_profile ON profile_known_associate(profile_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_known_associate_associate ON profile_known_associate(associate_id) WHERE is_active = TRUE;

-- ── Profile Last Locations ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile_last_location (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES criminal_profile(id) ON DELETE CASCADE,
  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  address           TEXT,
  source            TEXT NOT NULL,                           -- sighting, ai_detection, gps_tag, manual_entry
  source_id         UUID,
  accuracy_meters   DECIMAL(10,2),
  noted_at          TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_last_location_profile ON profile_last_location(profile_id);
CREATE INDEX IF NOT EXISTS idx_last_location_geo ON profile_last_location USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_last_location_noted ON profile_last_location(profile_id, noted_at DESC);

-- ── Profile Threat Assessments ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile_threat_assessment (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES criminal_profile(id) ON DELETE CASCADE,
  assessed_by           UUID NOT NULL REFERENCES "user"(id),
  threat_level          TEXT NOT NULL,                       -- low, medium, high, critical
  risk_factors          JSONB,
  assessment_notes      TEXT,
  recommended_actions   TEXT,
  valid_from            TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to              TIMESTAMPTZ,
  is_current            BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threat_assessment_profile ON profile_threat_assessment(profile_id, is_current);

-- ── Entity Profiles (AI/monitoring-side entity representation) ─────────────

CREATE TABLE IF NOT EXISTS entity_profile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           TEXT NOT NULL,
  display_name          TEXT,
  primary_face_image_url TEXT,
  primary_face_embedding JSONB,
  known_plate_numbers   JSONB NOT NULL DEFAULT '[]'::jsonb,
  attributes            JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at         TIMESTAMPTZ,
  last_seen_at          TIMESTAMPTZ,
  detection_count       INTEGER NOT NULL DEFAULT 0,
  locations_seen        JSONB NOT NULL DEFAULT '[]'::jsonb,
  status                TEXT NOT NULL DEFAULT 'ACTIVE',
  watchlist_status      TEXT NOT NULL DEFAULT 'NONE',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_profile_type ON entity_profile(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_profile_status ON entity_profile(status);
CREATE INDEX IF NOT EXISTS idx_entity_profile_watchlist ON entity_profile(watchlist_status);

-- ── Face Detection Records ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS face_detection (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id UUID REFERENCES entity_profile(id) ON DELETE SET NULL,
  media_asset_id    UUID NOT NULL,                            -- FK to media_asset
  camera_id         TEXT,
  embedding         JSONB NOT NULL,
  face_image_url    TEXT,
  quality_score     NUMERIC(10,4),
  spatial_metadata  JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_face_detection_entity ON face_detection(entity_profile_id);
CREATE INDEX IF NOT EXISTS idx_face_detection_media ON face_detection(media_asset_id);

-- ── License Plate Detection Records ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plate_detection (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id UUID REFERENCES entity_profile(id) ON DELETE SET NULL,
  media_asset_id    UUID NOT NULL,                            -- FK to media_asset
  camera_id         TEXT,
  plate_text        TEXT NOT NULL,
  confidence        NUMERIC(10,4),
  spatial_metadata  JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plate_detection_entity ON plate_detection(entity_profile_id);
CREATE INDEX IF NOT EXISTS idx_plate_detection_media ON plate_detection(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_plate_detection_plate ON plate_detection(plate_text);

-- ── Person Attributes (from face detection analysis) ───────────────────────

CREATE TABLE IF NOT EXISTS person_attribute (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_detection_id   UUID NOT NULL REFERENCES face_detection(id) ON DELETE CASCADE,
  clothing_description TEXT,
  gender_presentation TEXT,
  estimated_age_range TEXT,
  height_estimate     TEXT,
  accessories         JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_person_attribute_face ON person_attribute(face_detection_id);

-- ── Watchlist Entries ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS watchlist_entry (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id UUID NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  priority_level    TEXT NOT NULL,
  reason            TEXT NOT NULL,
  case_id           UUID,                                     -- FK to cases
  expiry_date       TIMESTAMPTZ,
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_entry_entity ON watchlist_entry(entity_profile_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_entry_status ON watchlist_entry(status);
CREATE INDEX IF NOT EXISTS idx_watchlist_entry_priority ON watchlist_entry(priority_level);

-- ── Entity Matches (profile-to-entity linking) ─────────────────────────────

CREATE TABLE IF NOT EXISTS entity_match (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id UUID REFERENCES entity_profile(id) ON DELETE SET NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id  TEXT NOT NULL,
  similarity_score  NUMERIC(10,4) NOT NULL,
  matched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_match_profile ON entity_match(entity_profile_id);
CREATE INDEX IF NOT EXISTS idx_entity_match_source ON entity_match(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_match_score ON entity_match(similarity_score DESC);

-- ── Entity Tracks (movement tracking across cameras) ───────────────────────

CREATE TABLE IF NOT EXISTS entity_track (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id     UUID NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  track_status          TEXT NOT NULL DEFAULT 'ACTIVE',
  start_time            TIMESTAMPTZ NOT NULL,
  end_time              TIMESTAMPTZ,
  movement_path_geojson JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_per_segment JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_track_profile ON entity_track(entity_profile_id);
CREATE INDEX IF NOT EXISTS idx_entity_track_status ON entity_track(track_status);
CREATE INDEX IF NOT EXISTS idx_entity_track_time ON entity_track(start_time, end_time);

-- ── Movement Timeline ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS movement_timeline (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id UUID NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  time_range_start  TIMESTAMPTZ,
  time_range_end    TIMESTAMPTZ,
  timeline_entries  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movement_timeline_profile ON movement_timeline(entity_profile_id);

-- ── Track Segments (sighting-to-sighting movement) ─────────────────────────

CREATE TABLE IF NOT EXISTS track_segment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_track_id   UUID NOT NULL REFERENCES entity_track(id) ON DELETE CASCADE,
  from_sighting_id  UUID,
  to_sighting_id    UUID,
  distance_meters   NUMERIC(18,6),
  duration_seconds  INTEGER,
  speed_mps         NUMERIC(18,6),
  is_interpolated   BOOLEAN NOT NULL DEFAULT false,
  confidence        NUMERIC(10,4),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT track_segment_duration_ck CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT track_segment_confidence_ck CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE INDEX IF NOT EXISTS idx_track_segment_track ON track_segment(entity_track_id);

-- ── Movement Patterns ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS movement_pattern (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id UUID REFERENCES entity_profile(id) ON DELETE SET NULL,
  zone_id           UUID,                                     -- FK to monitoring_zone
  pattern_type      TEXT NOT NULL,
  description       TEXT,
  data              JSONB NOT NULL DEFAULT '{}'::jsonb,
  frequency         INTEGER NOT NULL DEFAULT 0,
  confidence        NUMERIC(10,4),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT movement_pattern_confidence_ck CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE INDEX IF NOT EXISTS idx_movement_pattern_profile ON movement_pattern(entity_profile_id);
CREATE INDEX IF NOT EXISTS idx_movement_pattern_type ON movement_pattern(pattern_type);

-- ── Movement Pattern Analysis ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS movement_pattern_analysis (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id UUID NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  time_range_start  TIMESTAMPTZ,
  time_range_end    TIMESTAMPTZ,
  common_routes     JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedules         JSONB NOT NULL DEFAULT '[]'::jsonb,
  anomalies         JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movement_pattern_analysis_profile ON movement_pattern_analysis(entity_profile_id);

-- ── Movement Predictions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS movement_prediction (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id UUID NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  predicted_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_camera_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movement_prediction_profile ON movement_prediction(entity_profile_id);

-- ── Geofences ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS geofence (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  boundary_geojson  JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule              TEXT NOT NULL DEFAULT 'BOTH',              -- ENTER, EXIT, BOTH
  entity_filter     JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofence_enabled ON geofence(enabled);

-- ── Geofence Violations ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS geofence_violation (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id       UUID NOT NULL REFERENCES geofence(id) ON DELETE CASCADE,
  entity_profile_id UUID REFERENCES entity_profile(id) ON DELETE SET NULL,
  violation_type    TEXT NOT NULL,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofence_violation_fence ON geofence_violation(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_violation_entity ON geofence_violation(entity_profile_id);
CREATE INDEX IF NOT EXISTS idx_geofence_violation_occurred ON geofence_violation(occurred_at DESC);
