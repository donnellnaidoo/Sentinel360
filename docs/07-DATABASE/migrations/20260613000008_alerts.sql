-- ============================================================================
-- Migration: 20260613000008_alerts.sql
-- Purpose:  Alert management, routing, delivery, notifications, AI models,
--           detections, monitoring sessions, edge infrastructure, audit,
--           compliance, and infrastructure management
-- Domain:   Alerts, AI/ML, Monitoring, Infrastructure & Audit
-- Applied:  2026-06-13
-- ============================================================================

-- ── Alerts (central alert table) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type              TEXT NOT NULL,                    -- wanted_person_sighting, suspicious_behavior, vehicle_match, threat_alert, system
  title                   TEXT NOT NULL,
  message                 TEXT NOT NULL,
  description             TEXT,
  severity                TEXT NOT NULL DEFAULT 'MEDIUM',   -- LOW, MEDIUM, HIGH, CRITICAL

  -- Source
  source_domain           TEXT,
  source_entity_type      TEXT,
  source_entity_id        TEXT,
  source                  TEXT,                             -- ai_detection, sighting, manual, system
  source_id               UUID,
  case_id                 UUID REFERENCES cases(id),
  profile_id              UUID REFERENCES criminal_profile(id),

  -- Targeting
  target_role             TEXT,                             -- community, security_operator, law_enforcement, all
  target_region           GEOGRAPHY(POLYGON, 4326),
  target_radius_meters    DECIMAL(10,2),

  -- Location
  location                GEOGRAPHY(POINT, 4326),
  location_address        TEXT,
  location_json           JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Status & lifecycle
  status                  TEXT NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE, ACKNOWLEDGED, RESOLVED, EXPIRED, CANCELLED
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedup_key               TEXT,
  dedup_window_seconds    INTEGER,
  escalation_level        INTEGER DEFAULT 0,
  escalation_sla_seconds  INTEGER,
  is_read                 BOOLEAN NOT NULL DEFAULT false,
  expires_at              TIMESTAMPTZ,

  -- Audit
  created_by              UUID REFERENCES "user"(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alert_status ON alert(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_severity ON alert(severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_type ON alert(alert_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_created ON alert(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_case ON alert(case_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_profile ON alert(profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_geo ON alert USING GIST(location) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_expires ON alert(expires_at) WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_dedup ON alert(dedup_key) WHERE dedup_key IS NOT NULL;

-- ── Alert Recipients (users targeted by alerts) ────────────────────────────

CREATE TABLE IF NOT EXISTS alert_recipient (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id          UUID NOT NULL REFERENCES alert(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  read_at           TIMESTAMPTZ,
  acknowledged_at   TIMESTAMPTZ,
  dismissed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(alert_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_recipient_alert ON alert_recipient(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_recipient_user ON alert_recipient(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_recipient_unread ON alert_recipient(user_id) WHERE read_at IS NULL;

-- ── Alert Delivery Logs ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_delivery_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id              UUID NOT NULL REFERENCES alert(id) ON DELETE CASCADE,
  recipient_id          UUID REFERENCES alert_recipient(id),
  channel               TEXT NOT NULL,                      -- push_notification, in_app, email, sms
  status                TEXT NOT NULL,                      -- pending, delivered, failed, bounced
  delivered_at          TIMESTAMPTZ,
  failed_at             TIMESTAMPTZ,
  failure_reason        TEXT,
  retry_count           INTEGER NOT NULL DEFAULT 0,
  provider_message_id   TEXT,                               -- FCM/APNS message ID
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_delivery_alert ON alert_delivery_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_status ON alert_delivery_log(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_alert_delivery_channel ON alert_delivery_log(channel);

-- ── Alert Routing Rules ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_routing_rule (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type          TEXT NOT NULL,
  severity_filter     JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipient_criteria  JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels            JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalation_chain    JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_routing_rule_type ON alert_routing_rule(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_routing_rule_active ON alert_routing_rule(is_active) WHERE is_active = TRUE;

-- ── Notifications (delivered notification records) ─────────────────────────

CREATE TABLE IF NOT EXISTS notification (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id            UUID NOT NULL REFERENCES alert(id) ON DELETE CASCADE,
  recipient_user_id   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL,
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  delivery_status     TEXT NOT NULL DEFAULT 'PENDING',
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  read_at             TIMESTAMPTZ,
  error_message       TEXT,
  retry_count         INTEGER NOT NULL DEFAULT 0,
  action_url          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_alert ON notification(alert_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipient ON notification(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_status ON notification(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_read ON notification(recipient_user_id) WHERE read_at IS NULL;

-- ── Notification Preferences ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preference (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  channel_preferences   JSONB NOT NULL DEFAULT '{}'::jsonb,
  digest_enabled        BOOLEAN NOT NULL DEFAULT false,
  digest_frequency      TEXT,
  quiet_hours           JSONB NOT NULL DEFAULT '{}'::jsonb,
  alert_type_overrides  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Alert Acknowledgments ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_acknowledgment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id          UUID NOT NULL REFERENCES alert(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  channel           TEXT,
  notes             TEXT,
  acknowledged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_acknowledgment_alert ON alert_acknowledgment(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_acknowledgment_user ON alert_acknowledgment(user_id);

-- ── AI Models Registry ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_model (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key         TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  model_type        TEXT NOT NULL,
  current_version   TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_model_version (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name          TEXT NOT NULL,
  model_framework     TEXT,                                 -- PyTorch, TensorFlow, ONNX
  version             TEXT NOT NULL,
  description         TEXT,

  -- Performance metrics
  accuracy            DECIMAL(5,2),
  precision           DECIMAL(5,2),
  recall              DECIMAL(5,2),
  f1_score            DECIMAL(5,2),
  latency_ms          DECIMAL(10,2),

  -- Artifacts
  model_s3_key        TEXT,
  model_sha256        TEXT,
  config_json         JSONB,

  -- Lifecycle
  status              TEXT NOT NULL DEFAULT 'staging',      -- development, staging, production, deprecated, archived
  promoted_by         UUID REFERENCES "user"(id),
  promoted_at         TIMESTAMPTZ,
  deprecated_at       TIMESTAMPTZ,

  -- Lineage
  parent_model_id     UUID REFERENCES ai_model_version(id),
  training_dataset_id TEXT,
  training_notes      TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(model_name, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_version_name ON ai_model_version(model_name, status);

-- ── AI Inference Results ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_inference_result (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id      UUID NOT NULL REFERENCES ai_model_version(id),
  evidence_id           UUID REFERENCES evidence(id),
  profile_id            UUID REFERENCES criminal_profile(id),

  -- Detection
  detection_class       TEXT,                               -- person, vehicle, face, license_plate, abnormal_activity
  detection_confidence  DECIMAL(5,2) NOT NULL,
  bounding_box          JSONB,

  -- Identification
  match_profile_id      UUID REFERENCES criminal_profile(id),
  match_confidence      DECIMAL(5,2),

  -- Embedding
  embedding_vector      VECTOR(512),

  -- Source
  source_camera_id      TEXT,
  source_frame_timestamp TIMESTAMPTZ,
  raw_output            JSONB,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_inference_evidence ON ai_inference_result(evidence_id);
CREATE INDEX IF NOT EXISTS idx_ai_inference_profile ON ai_inference_result(profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_inference_model ON ai_inference_result(model_version_id);
CREATE INDEX IF NOT EXISTS idx_ai_inference_confidence ON ai_inference_result(match_confidence DESC) WHERE match_confidence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_inference_created ON ai_inference_result(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_inference_class ON ai_inference_result(detection_class);

-- ── Detection Configuration ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS detection_configuration (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id               TEXT,
  zone_id                 UUID REFERENCES monitoring_zone(id) ON DELETE SET NULL,
  enabled_detection_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_threshold    NUMERIC(10,4) NOT NULL DEFAULT 0.7,
  sensitivity             TEXT NOT NULL DEFAULT 'MEDIUM',
  regions_of_interest     JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_schedule         JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id      TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  updated_by_user_id      TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT detection_configuration_confidence_ck CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1)
);

CREATE INDEX IF NOT EXISTS idx_detection_configuration_camera ON detection_configuration(camera_id);
CREATE INDEX IF NOT EXISTS idx_detection_configuration_zone ON detection_configuration(zone_id);

-- ── Detections (AI model detection events) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS detection (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detection_type            TEXT NOT NULL,
  classification            TEXT NOT NULL,
  confidence                NUMERIC(10,4) NOT NULL,
  severity                  TEXT NOT NULL,
  media_asset_id            UUID NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  camera_id                 TEXT,
  detection_configuration_id UUID REFERENCES detection_configuration(id) ON DELETE SET NULL,
  zone_id                   UUID REFERENCES monitoring_zone(id) ON DELETE SET NULL,
  timestamp_start           NUMERIC(12,3) NOT NULL,
  timestamp_end             NUMERIC(12,3),
  bounding_box              JSONB,
  frame_url                 TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status             TEXT NOT NULL DEFAULT 'PENDING',
  reviewed_by_user_id       TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at               TIMESTAMPTZ,
  escalated_to_incident_id  UUID REFERENCES incident(id) ON DELETE SET NULL,
  model_id                  UUID REFERENCES ai_model(id) ON DELETE SET NULL,
  model_version             TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT detection_confidence_ck CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT detection_timestamp_order_ck CHECK (timestamp_end IS NULL OR timestamp_end >= timestamp_start)
);

CREATE INDEX IF NOT EXISTS idx_detection_media ON detection(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_detection_camera ON detection(camera_id);
CREATE INDEX IF NOT EXISTS idx_detection_review_status ON detection(review_status);
CREATE INDEX IF NOT EXISTS idx_detection_type ON detection(detection_type);
CREATE INDEX IF NOT EXISTS idx_detection_severity ON detection(severity);

-- ── Monitoring Sessions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monitoring_session (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  camera_ids            JSONB NOT NULL DEFAULT '[]'::jsonb,
  zone_ids              JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at              TIMESTAMPTZ,
  alerts_handled        INTEGER NOT NULL DEFAULT 0,
  detections_reviewed   INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_session_time_ck CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_monitoring_session_operator ON monitoring_session(operator_user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_session_active ON monitoring_session(operator_user_id) WHERE ended_at IS NULL;

-- ── Operator Shifts ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS operator_shift (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_user_id    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  zone_ids            JSONB NOT NULL DEFAULT '[]'::jsonb,
  shift_start         TIMESTAMPTZ NOT NULL,
  shift_end           TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'SCHEDULED',
  created_by_user_id  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT operator_shift_time_ck CHECK (shift_end > shift_start)
);

CREATE INDEX IF NOT EXISTS idx_operator_shift_operator ON operator_shift(operator_user_id);
CREATE INDEX IF NOT EXISTS idx_operator_shift_status ON operator_shift(status);
CREATE INDEX IF NOT EXISTS idx_operator_shift_time ON operator_shift(shift_start, shift_end);

-- ── Edge Nodes (IoT/edge devices) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS edge_node (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  location          JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_type       TEXT,
  hardware_specs    JSONB NOT NULL DEFAULT '{}'::jsonb,
  network_address   TEXT,
  status            TEXT NOT NULL DEFAULT 'REGISTERED',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_node_status ON edge_node(status);
CREATE INDEX IF NOT EXISTS idx_edge_node_type ON edge_node(device_type);

-- ── Edge Model Deployments ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS edge_model_deployment (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id        UUID NOT NULL REFERENCES edge_node(id) ON DELETE CASCADE,
  model_name          TEXT NOT NULL,
  model_version       TEXT NOT NULL,
  deployment_status   TEXT NOT NULL DEFAULT 'PENDING',
  deployed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_model_deployment_node ON edge_model_deployment(edge_node_id);

-- ── Edge Node Configuration ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS edge_node_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id          UUID NOT NULL UNIQUE REFERENCES edge_node(id) ON DELETE CASCADE,
  detection_zones       JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_schedule   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Edge Configuration (versioned edge configs) ───────────────────────────

CREATE TABLE IF NOT EXISTS edge_configuration (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id      UUID NOT NULL UNIQUE REFERENCES edge_node(id) ON DELETE CASCADE,
  config            JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from    TIMESTAMPTZ,
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Edge Sync Records ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS edge_sync_record (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id      UUID NOT NULL REFERENCES edge_node(id) ON DELETE CASCADE,
  sync_type         TEXT NOT NULL,
  payload_size_bytes BIGINT NOT NULL DEFAULT 0,
  items_count       INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'PENDING',
  payload_hash      TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_sync_node ON edge_sync_record(edge_node_id);
CREATE INDEX IF NOT EXISTS idx_edge_sync_status ON edge_sync_record(status);

-- ── Edge Health Metrics ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS edge_health_metric (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id        UUID NOT NULL REFERENCES edge_node(id) ON DELETE CASCADE,
  cpu_utilization     NUMERIC(10,4),
  memory_usage        NUMERIC(10,4),
  storage_usage       NUMERIC(10,4),
  temperature         NUMERIC(10,4),
  network_latency     NUMERIC(10,4),
  inference_fps       NUMERIC(10,4),
  inference_latency_ms NUMERIC(10,4),
  reported_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_health_node ON edge_health_metric(edge_node_id);
CREATE INDEX IF NOT EXISTS idx_edge_health_reported ON edge_health_metric(reported_at DESC);

-- ── Audit Log (immutable, append-only) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type          TEXT NOT NULL,
  domain              TEXT NOT NULL,
  actor_id            TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  actor_type          TEXT NOT NULL DEFAULT 'USER',
  user_id             UUID REFERENCES "user"(id),
  user_role           TEXT,
  target_entity_type  TEXT,
  target_entity_id    TEXT,
  action              TEXT NOT NULL,
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  description         TEXT,
  metadata            JSONB,
  ip_address          TEXT,
  user_agent          TEXT,
  session_id          UUID,
  request_id          UUID,
  geographic_location GEOGRAPHY(POINT, 4326),
  entry_hash          TEXT NOT NULL UNIQUE,
  previous_hash       TEXT,
  status              TEXT NOT NULL DEFAULT 'COMPLETE',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create initial monthly partitions
CREATE TABLE IF NOT EXISTS audit_log_2026_06 PARTITION OF audit_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_07 PARTITION OF audit_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_08 PARTITION OF audit_log
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_09 PARTITION OF audit_log
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Audit log indexes (on parent, propagates to partitions)
CREATE INDEX IF NOT EXISTS idx_audit_log_domain ON audit_log(domain);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_ip ON audit_log(ip_address);

-- ── Compliance Reports ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_report (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  report_type         TEXT NOT NULL,
  date_range_start    TIMESTAMPTZ,
  date_range_end      TIMESTAMPTZ,
  content             JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_report_type ON compliance_report(report_type);

-- ── Compliance Checks ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_check (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework         TEXT NOT NULL,
  check_type        TEXT NOT NULL,
  status            TEXT NOT NULL,
  findings          JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations   JSONB NOT NULL DEFAULT '[]'::jsonb,
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  next_check_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_check_framework ON compliance_check(framework, status);

-- ── System Backups ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_backup (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type       TEXT NOT NULL,
  scope             TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'SCHEDULED',
  file_url          TEXT,
  file_size_bytes   BIGINT,
  file_hash         TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT system_backup_time_ck CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_system_backup_status ON system_backup(status);

-- ── Infrastructure Management ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS infrastructure_environment (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                          TEXT NOT NULL UNIQUE,
  environment_type              TEXT NOT NULL,
  region                        TEXT,
  status                        TEXT NOT NULL DEFAULT 'PROVISIONING',
  services                      JSONB NOT NULL DEFAULT '{}'::jsonb,
  infrastructure_template_version TEXT,
  provisioned_at                TIMESTAMPTZ,
  last_deployment_at            TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_infrastructure_env_status ON infrastructure_environment(status);

CREATE TABLE IF NOT EXISTS service_instance (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name        TEXT NOT NULL,
  environment_id      UUID NOT NULL REFERENCES infrastructure_environment(id) ON DELETE CASCADE,
  version             TEXT NOT NULL,
  instance_count      INTEGER NOT NULL DEFAULT 1,
  min_instances       INTEGER NOT NULL DEFAULT 1,
  max_instances       INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'RUNNING',
  health_check_url    TEXT,
  last_health_check_at TIMESTAMPTZ,
  resource_allocation JSONB NOT NULL DEFAULT '{}'::jsonb,
  scaling_policy      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_instance_counts_ck CHECK (min_instances >= 0 AND max_instances >= min_instances AND instance_count >= min_instances AND instance_count <= max_instances)
);

CREATE INDEX IF NOT EXISTS idx_service_instance_environment ON service_instance(environment_id);

CREATE TABLE IF NOT EXISTS scaling_event (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_instance_id UUID REFERENCES service_instance(id) ON DELETE SET NULL,
  service_name        TEXT NOT NULL,
  environment_id      UUID REFERENCES infrastructure_environment(id) ON DELETE SET NULL,
  direction           TEXT NOT NULL,
  trigger_metric      TEXT NOT NULL,
  trigger_value       NUMERIC(18,6),
  threshold           NUMERIC(18,6),
  from_count          INTEGER NOT NULL,
  to_count            INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'INITIATED',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scaling_event_service ON scaling_event(service_name);

CREATE TABLE IF NOT EXISTS disaster_recovery_event (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type              TEXT NOT NULL,
  trigger_reason            TEXT,
  source_environment_id     UUID REFERENCES infrastructure_environment(id) ON DELETE SET NULL,
  target_environment_id     UUID REFERENCES infrastructure_environment(id) ON DELETE SET NULL,
  status                    TEXT NOT NULL DEFAULT 'INITIATED',
  failover_started_at       TIMESTAMPTZ,
  failover_completed_at     TIMESTAMPTZ,
  restoration_started_at    TIMESTAMPTZ,
  restoration_completed_at  TIMESTAMPTZ,
  data_loss_window          TEXT,
  initiated_by_user_id      TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dr_event_status ON disaster_recovery_event(status);

CREATE TABLE IF NOT EXISTS network_security_rule (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id    UUID REFERENCES infrastructure_environment(id) ON DELETE SET NULL,
  rule_name         TEXT NOT NULL,
  direction         TEXT NOT NULL,
  protocol          TEXT,
  source_cidr       TEXT,
  destination_cidr  TEXT,
  port_range        TEXT,
  action            TEXT NOT NULL,
  priority          INTEGER NOT NULL DEFAULT 100,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_network_security_rule_env ON network_security_rule(environment_id);

-- ── Deployment Records ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deployment_record (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment         TEXT NOT NULL,
  version             TEXT NOT NULL,
  status              TEXT NOT NULL,
  deployed_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployment_record_env ON deployment_record(environment, status);

-- ── Infrastructure Events ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS infrastructure_event (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        TEXT NOT NULL,
  severity          TEXT,
  details           JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_infrastructure_event_type ON infrastructure_event(event_type);
CREATE INDEX IF NOT EXISTS idx_infrastructure_event_severity ON infrastructure_event(severity);
CREATE INDEX IF NOT EXISTS idx_infrastructure_event_occurred ON infrastructure_event(occurred_at DESC);

-- ── Emergency Operation Logs ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emergency_operation_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action            TEXT NOT NULL,
  actor_user_id     TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  details           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergency_operation_actor ON emergency_operation_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_operation_created ON emergency_operation_log(created_at DESC);
