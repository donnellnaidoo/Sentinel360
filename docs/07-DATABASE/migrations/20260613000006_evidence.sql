-- ============================================================================
-- Migration: 20260613000006_evidence.sql
-- Purpose:  Evidence management, chain of custody, integrity checks, media
--           assets, metadata, transcoding, annotations, 3D reconstruction,
--           ALPR records, and external integrations
-- Domain:   Evidence & Media
-- Applied:  2026-06-13
-- ============================================================================

-- ── Evidence (core evidence table with cryptographic chain) ─────────────────

CREATE TABLE IF NOT EXISTS evidence (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_type         TEXT NOT NULL,                      -- snapshot, video_clip, witness_statement, document, 3d_reconstruction, audio, alpr_record
  title                 TEXT NOT NULL,
  description           TEXT,

  -- File metadata
  s3_key                TEXT,
  cdn_url               TEXT,
  file_size_bytes       BIGINT,
  mime_type             TEXT,
  width                 INTEGER,
  height                INTEGER,
  duration_seconds      DECIMAL(10,2),
  thumbnail_s3_key      TEXT,

  -- Cryptographic integrity (SHA-256 chain)
  sha256_hash           TEXT NOT NULL,
  previous_hash         TEXT,
  chain_position        INTEGER NOT NULL DEFAULT 1,

  -- Source
  source                TEXT NOT NULL,                      -- ai_capture, upload, system_generated, external_import, sighting
  source_id             UUID,
  captured_at           TIMESTAMPTZ,
  captured_by_device    TEXT,

  -- Geolocation
  location              GEOGRAPHY(POINT, 4326),
  location_address      TEXT,

  -- Status & verification
  status                TEXT NOT NULL DEFAULT 'pending',    -- pending, verified, rejected, admitted, archived
  verified_by           UUID REFERENCES "user"(id),
  verified_at           TIMESTAMPTZ,
  verification_notes    TEXT,

  -- AI metadata
  ai_confidence_score   DECIMAL(5,2),
  ai_model_version_id   UUID,                              -- FK to ai_model_versions

  -- Audit
  created_by            UUID REFERENCES "user"(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(evidence_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence(source, source_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_geo ON evidence USING GIST(location) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_captured ON evidence(captured_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_ai_score ON evidence(ai_confidence_score DESC) WHERE ai_confidence_score IS NOT NULL;

-- ── Evidence Chain of Custody (immutable audit trail) ──────────────────────

CREATE TABLE IF NOT EXISTS evidence_chain_of_custody (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id       UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  action            TEXT NOT NULL,                          -- created, accessed, viewed, exported, transferred, verified, modified, archived
  performed_by      UUID NOT NULL REFERENCES "user"(id),
  performed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address        TEXT,
  user_agent        TEXT,
  previous_hash     TEXT,
  current_hash      TEXT NOT NULL,
  notes             TEXT,
  metadata          JSONB
);

CREATE INDEX IF NOT EXISTS idx_chain_evidence ON evidence_chain_of_custody(evidence_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_chain_user ON evidence_chain_of_custody(performed_by);
CREATE INDEX IF NOT EXISTS idx_chain_hash ON evidence_chain_of_custody(current_hash);

-- ── Evidence Tags ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evidence_tag (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id       UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  tag               TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evidence_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_evidence_tag_tag ON evidence_tag(tag);
CREATE INDEX IF NOT EXISTS idx_evidence_tag_evidence ON evidence_tag(evidence_id);

-- ── Evidence Integrity Checks ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evidence_integrity_check (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_entity_type  TEXT NOT NULL,
  evidence_entity_id    TEXT NOT NULL,
  computed_hash         TEXT NOT NULL,
  stored_hash           TEXT NOT NULL,
  is_valid              BOOLEAN NOT NULL,
  checked_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrity_check_entity ON evidence_integrity_check(evidence_entity_type, evidence_entity_id);
CREATE INDEX IF NOT EXISTS idx_integrity_check_valid ON evidence_integrity_check(is_valid);

-- ── Evidence Requests (LEO requesting evidence from operators) ─────────────

CREATE TABLE IF NOT EXISTS evidence_request (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_officer_id UUID NOT NULL REFERENCES law_enforcement_officer(id) ON DELETE CASCADE,
  case_id               UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  request_type          TEXT NOT NULL,
  description           TEXT NOT NULL,
  parameters            JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                TEXT NOT NULL DEFAULT 'REQUESTED',
  assigned_to_user_id   TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  fulfillment_notes     TEXT,
  evidence_ids          JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evidence_request_fulfilled_time_ck CHECK (fulfilled_at IS NULL OR fulfilled_at >= requested_at)
);

CREATE INDEX IF NOT EXISTS idx_evidence_request_case ON evidence_request(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_request_status ON evidence_request(status);
CREATE INDEX IF NOT EXISTS idx_evidence_request_officer ON evidence_request(requesting_officer_id);

-- ── Media Assets ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_asset (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  source              TEXT NOT NULL,
  source_camera_id    TEXT,
  original_filename   TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  file_size           BIGINT NOT NULL,
  file_hash           TEXT NOT NULL UNIQUE,
  storage_url         TEXT NOT NULL,
  storage_tier        TEXT NOT NULL DEFAULT 'HOT',
  duration            INTEGER,
  resolution          TEXT,
  codec               TEXT,
  framerate           NUMERIC(10,3),
  gps_latitude        NUMERIC(10,7),
  gps_longitude       NUMERIC(10,7),
  status              TEXT NOT NULL DEFAULT 'PROCESSING',
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_asset_type ON media_asset(type);
CREATE INDEX IF NOT EXISTS idx_media_asset_source ON media_asset(source);
CREATE INDEX IF NOT EXISTS idx_media_asset_created_at ON media_asset(created_at);
CREATE INDEX IF NOT EXISTS idx_media_asset_status ON media_asset(status);
CREATE INDEX IF NOT EXISTS idx_media_asset_hash ON media_asset(file_hash);

-- ── Media Metadata ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_metadata (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id    UUID NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_metadata_asset ON media_metadata(media_asset_id);

-- ── Media Transcoded Variants ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_transcoded_variant (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id    UUID NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  variant_label     TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  storage_url       TEXT NOT NULL,
  file_size         BIGINT NOT NULL,
  resolution        TEXT,
  codec             TEXT,
  framerate         NUMERIC(10,3),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_variant_asset ON media_transcoded_variant(media_asset_id);

-- ── Media Retention Records ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_retention_record (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id      UUID NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  retention_policy_id UUID REFERENCES retention_policy(id) ON DELETE SET NULL,
  archived_at         TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  legal_hold_active   BOOLEAN NOT NULL DEFAULT false,
  hold_reason         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_retention_asset ON media_retention_record(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_retention_legal_hold ON media_retention_record(legal_hold_active) WHERE legal_hold_active = TRUE;

-- ── Media Annotations ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_annotation (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id    UUID NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  annotation_type   TEXT NOT NULL,
  value             TEXT NOT NULL,
  timestamp_start   NUMERIC(12,3),
  timestamp_end     NUMERIC(12,3),
  bounding_box      JSONB,
  confidence        NUMERIC(10,4),
  source            TEXT NOT NULL DEFAULT 'MANUAL',
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT media_annotation_confidence_ck CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT media_annotation_timestamp_ck CHECK (timestamp_end IS NULL OR timestamp_start IS NULL OR timestamp_end >= timestamp_start)
);

CREATE INDEX IF NOT EXISTS idx_media_annotation_asset ON media_annotation(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_annotation_type ON media_annotation(annotation_type);

-- ── ALPR Records (license plate recognition) ───────────────────────────────

CREATE TABLE IF NOT EXISTS alpr_record (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate     TEXT NOT NULL,
  plate_country     TEXT,
  plate_state       TEXT,
  vehicle_make      TEXT,
  vehicle_model     TEXT,
  vehicle_color     TEXT,
  vehicle_year      INTEGER,
  confidence_score  DECIMAL(5,2) NOT NULL,
  evidence_id       UUID REFERENCES evidence(id),
  profile_id        UUID REFERENCES criminal_profile(id),
  location          GEOGRAPHY(POINT, 4326),
  captured_at       TIMESTAMPTZ NOT NULL,
  camera_id         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alpr_plate ON alpr_record(license_plate);
CREATE INDEX IF NOT EXISTS idx_alpr_captured ON alpr_record(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_alpr_geo ON alpr_record USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_alpr_evidence ON alpr_record(evidence_id);
CREATE INDEX IF NOT EXISTS idx_alpr_profile ON alpr_record(profile_id);

-- ── 3D Reconstruction Projects ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reconstruction_project (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT,
  location            JSONB NOT NULL DEFAULT '{}'::jsonb,
  linked_incident_id  UUID REFERENCES incident(id) ON DELETE SET NULL,
  linked_case_id      UUID REFERENCES cases(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'SETUP',
  created_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconstruction_project_case ON reconstruction_project(linked_case_id);
CREATE INDEX IF NOT EXISTS idx_reconstruction_project_status ON reconstruction_project(status);

-- ── Reconstruction Assets (source files for 3D reconstruction) ────────────

CREATE TABLE IF NOT EXISTS reconstruction_asset (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  asset_type        TEXT NOT NULL,
  storage_url       TEXT NOT NULL,
  scale_metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_metrics   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconstruction_asset_project ON reconstruction_asset(project_id);

-- ── Source Files (for reconstruction projects) ─────────────────────────────

CREATE TABLE IF NOT EXISTS source_file (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  file_type           TEXT NOT NULL,
  file_url            TEXT NOT NULL,
  file_hash           TEXT NOT NULL,
  mime_type           TEXT,
  file_size           BIGINT,
  camera_params       JSONB,
  gps_location        JSONB,
  capture_timestamp   TIMESTAMPTZ,
  processing_status   TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_file_project ON source_file(project_id);
CREATE INDEX IF NOT EXISTS idx_source_file_status ON source_file(processing_status);

-- ── Evidence Markers (3D scene markers linked to evidence) ─────────────────

CREATE TABLE IF NOT EXISTS evidence_marker (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  description         TEXT,
  evidence_type       TEXT,
  linked_evidence_type TEXT,
  linked_evidence_id  TEXT,
  coordinates_3d      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_marker_project ON evidence_marker(project_id);

-- ── Scene Measurements ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scene_measurement (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  measurement_type    TEXT NOT NULL,
  reference_points    JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_value      NUMERIC(18,6) NOT NULL,
  unit                TEXT,
  accuracy_margin     NUMERIC(18,6),
  saved_as_annotation BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scene_measurement_project ON scene_measurement(project_id);

-- ── Scene Annotations ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scene_annotation (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  annotation_type     TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  position_3d         JSONB NOT NULL DEFAULT '{}'::jsonb,
  normal_vector       JSONB,
  linked_evidence_id  TEXT,
  icon                TEXT,
  color               TEXT,
  created_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scene_annotation_project ON scene_annotation(project_id);

-- ── External Integrations ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS external_integration (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL UNIQUE,
  integration_type  TEXT NOT NULL,
  endpoint_url      TEXT,
  auth_method       TEXT,
  data_format       TEXT,
  status            TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  test_date         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_integration_type ON external_integration(integration_type);
CREATE INDEX IF NOT EXISTS idx_external_integration_status ON external_integration(status);

-- ── Webhook Configurations ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhook_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  events_subscribed JSONB NOT NULL DEFAULT '[]'::jsonb,
  secret_key_hash   TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_config_integration ON webhook_config(integration_id);

-- ── API Keys ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_key (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id      UUID NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  key_hash            TEXT NOT NULL,
  scope_permissions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  expiry_date         TIMESTAMPTZ,
  created_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_key_integration ON api_key(integration_id);

-- ── Integration Export Logs ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_export_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  export_type       TEXT NOT NULL,
  data_count        INTEGER NOT NULL DEFAULT 0,
  file_hash         TEXT,
  delivery_status   TEXT NOT NULL DEFAULT 'PENDING',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_export_log_integration ON integration_export_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_export_log_status ON integration_export_log(delivery_status);

-- ── Integration Import Logs ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_import_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  import_type       TEXT NOT NULL,
  records_imported  INTEGER NOT NULL DEFAULT 0,
  records_failed    INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_import_log_integration ON integration_import_log(integration_id);

-- ── Integration Health Metrics ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_health (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  response_time_ms  NUMERIC(10,4),
  success_rate      NUMERIC(10,4),
  last_check_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_health_integration ON integration_health(integration_id);
