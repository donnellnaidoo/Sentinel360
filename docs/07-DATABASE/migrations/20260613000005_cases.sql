-- ============================================================================
-- Migration: 20260613000005_cases.sql
-- Purpose:  Case/docket management, incidents, case-criminal linking,
--           case evidence, timeline, activity logs, notes, reports,
--           cameras, monitoring zones, and dispatching
-- Domain:   Cases & Incidents
-- Applied:  2026-06-13
-- ============================================================================

-- ── Cases (central case/docket table) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS cases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number           TEXT NOT NULL UNIQUE,
  case_type             TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  category              TEXT,                              -- theft, assault, robbery, hijacking, vandalism, missing_person, etc.
  priority              TEXT NOT NULL DEFAULT 'MEDIUM',    -- LOW, MEDIUM, HIGH, CRITICAL
  status                TEXT NOT NULL DEFAULT 'OPEN',      -- OPEN, UNDER_INVESTIGATION, AWAITING_REVIEW, CLOSED, ARCHIVED
  status_changed_at     TIMESTAMPTZ,
  status_changed_by     UUID REFERENCES "user"(id),
  assigned_investigator UUID REFERENCES "user"(id),
  assigned_team         TEXT[],
  jurisdiction          TEXT,
  incident_location     GEOGRAPHY(POINT, 4326),
  incident_address      TEXT,
  incident_started_at   TIMESTAMPTZ,
  incident_ended_at     TIMESTAMPTZ,
  reported_by           UUID REFERENCES "user"(id),
  reported_at           TIMESTAMPTZ,
  is_sensitive          BOOLEAN NOT NULL DEFAULT false,
  closure_notes         TEXT,
  closed_at             TIMESTAMPTZ,
  closed_by             UUID REFERENCES "user"(id),
  resolution_notes      TEXT,
  created_by_user_id    TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cases_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_investigator ON cases(assigned_investigator) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_geo ON cases USING GIST(incident_location) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_incident_start ON cases(incident_started_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority) WHERE deleted_at IS NULL;

-- ── Incidents (events that may become cases) ────────────────────────────────

CREATE TABLE IF NOT EXISTS incident (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number     TEXT NOT NULL UNIQUE,
  incident_type       TEXT NOT NULL,
  title               TEXT,
  description         TEXT NOT NULL,
  location            JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at         TIMESTAMPTZ,
  severity            TEXT NOT NULL DEFAULT 'MEDIUM',
  status              TEXT NOT NULL DEFAULT 'REPORTED',
  source_domain       TEXT,
  source_entity_type  TEXT,
  source_entity_id    TEXT,
  reported_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_status ON incident(status);
CREATE INDEX IF NOT EXISTS idx_incident_severity ON incident(severity);
CREATE INDEX IF NOT EXISTS idx_incident_type ON incident(incident_type);
CREATE INDEX IF NOT EXISTS idx_incident_number ON incident(incident_number);
CREATE INDEX IF NOT EXISTS idx_incident_occurred ON incident(occurred_at DESC);

-- ── Case-Incident Linking ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_incident (
  case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, incident_id)
);

CREATE INDEX IF NOT EXISTS idx_case_incident_case ON case_incident(case_id);
CREATE INDEX IF NOT EXISTS idx_case_incident_incident ON case_incident(incident_id);

-- ── Case Criminals (linking profiles to cases with roles) ──────────────────

CREATE TABLE IF NOT EXISTS case_criminal (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                 UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  profile_id              UUID NOT NULL REFERENCES criminal_profile(id) ON DELETE CASCADE,
  role                    TEXT NOT NULL DEFAULT 'suspect',   -- suspect, person_of_interest, witness, victim, arrested
  involvement_description TEXT,
  arrested_at             TIMESTAMPTZ,
  arrested_by             UUID REFERENCES "user"(id),
  UNIQUE(case_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_case_criminal_case ON case_criminal(case_id);
CREATE INDEX IF NOT EXISTS idx_case_criminal_profile ON case_criminal(profile_id);

-- ── Case Evidence (linking evidence to cases) ─────────────────────────────

CREATE TABLE IF NOT EXISTS case_evidence (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                 UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  evidence_id             UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  relationship_description TEXT,
  relevance_notes         TEXT,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  added_by                UUID REFERENCES "user"(id),
  added_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at              TIMESTAMPTZ,
  UNIQUE(case_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON case_evidence(case_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_case_evidence_evidence ON case_evidence(evidence_id);

-- ── Case Timeline Entries ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_timeline_entry (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type        TEXT NOT NULL,                          -- incident_occurred, evidence_added, suspect_identified, arrest_made, status_change
  title             TEXT NOT NULL,
  description       TEXT,
  occurred_at       TIMESTAMPTZ NOT NULL,
  source            TEXT,                                   -- system, manual, ai_detection
  source_id         UUID,
  created_by        UUID REFERENCES "user"(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_timeline_case ON case_timeline_entry(case_id, occurred_at);

-- ── Case Activity Logs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_activity_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES "user"(id),
  action            TEXT NOT NULL,                           -- case_created, evidence_linked, status_changed, investigator_assigned
  description       TEXT,
  metadata          JSONB,
  ip_address        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_activity_case ON case_activity_log(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_activity_user ON case_activity_log(user_id);

-- ── Case Notes (investigator notes on a case) ──────────────────────────────

CREATE TABLE IF NOT EXISTS case_note (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_id         UUID NOT NULL REFERENCES "user"(id),
  note_type         TEXT NOT NULL DEFAULT 'general',         -- general, interview, surveillance, forensic, legal
  content           TEXT NOT NULL,
  is_private        BOOLEAN NOT NULL DEFAULT false,
  edited_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_case_note_case ON case_note(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_note_author ON case_note(author_id);

-- ── Case Reports (generated PDF/documents) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS case_report (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  report_type         TEXT NOT NULL,
  title               TEXT NOT NULL,
  sections            JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_url            TEXT NOT NULL,
  file_hash           TEXT NOT NULL,
  format              TEXT NOT NULL,
  is_signed           BOOLEAN NOT NULL DEFAULT false,
  generated_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_report_case ON case_report(case_id);
CREATE INDEX IF NOT EXISTS idx_case_report_type ON case_report(report_type);

-- ── Case Share Records (inter-agency sharing) ──────────────────────────────

CREATE TABLE IF NOT EXISTS case_share_record (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  shared_by_user_id   TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  target_agency       TEXT NOT NULL,
  integration_id      UUID,                                 -- FK to external_integration
  scope               JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_hash           TEXT NOT NULL,
  sharing_agreement_ref TEXT,
  shared_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_share_record_case ON case_share_record(case_id);

-- ── Dispatch Requests ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dispatch_request (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         UUID REFERENCES incident(id) ON DELETE SET NULL,
  dispatch_type       TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'CREATED',
  assigned_to_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_request_incident ON dispatch_request(incident_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_request_status ON dispatch_request(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_request_assigned ON dispatch_request(assigned_to_user_id);

-- ── Cameras ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS camera (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  location          JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_type       TEXT,
  stream_url        TEXT,
  capabilities      JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camera_status ON camera(status);
CREATE INDEX IF NOT EXISTS idx_camera_type ON camera(device_type);

-- ── Monitoring Zones ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monitoring_zone (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  boundary_geojson        JSONB NOT NULL DEFAULT '{}'::jsonb,
  threat_level            TEXT,
  assigned_camera_ids     JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_detection_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id      TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_zone_name ON monitoring_zone(name);

-- ── Operational Reports ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS operational_report (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type         TEXT NOT NULL,
  title               TEXT NOT NULL,
  date_range_start    TIMESTAMPTZ,
  date_range_end      TIMESTAMPTZ,
  parameters          JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url            TEXT,
  file_hash           TEXT,
  format              TEXT,
  generated_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'GENERATING',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT operational_report_range_ck CHECK (date_range_end IS NULL OR date_range_start IS NULL OR date_range_end >= date_range_start)
);

CREATE INDEX IF NOT EXISTS idx_operational_report_type ON operational_report(report_type);
CREATE INDEX IF NOT EXISTS idx_operational_report_status ON operational_report(status);
