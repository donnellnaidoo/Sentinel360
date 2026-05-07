-- Completes missing core domain entities across Sentinel360.
-- This migration is additive and safe against the existing 0001 baseline.

CREATE TABLE IF NOT EXISTS ai_model (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  model_type text NOT NULL,
  current_version text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS detection_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id text,
  zone_id uuid REFERENCES monitoring_zone(id) ON DELETE SET NULL,
  enabled_detection_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_threshold numeric(10,4) NOT NULL DEFAULT 0.7,
  sensitivity text NOT NULL DEFAULT 'MEDIUM',
  regions_of_interest jsonb NOT NULL DEFAULT '[]'::jsonb,
  active_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT detection_configuration_confidence_ck CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1)
);

CREATE TABLE IF NOT EXISTS detection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detection_type text NOT NULL,
  classification text NOT NULL,
  confidence numeric(10,4) NOT NULL,
  severity text NOT NULL,
  media_asset_id uuid NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  camera_id text,
  detection_configuration_id uuid REFERENCES detection_configuration(id) ON DELETE SET NULL,
  zone_id uuid REFERENCES monitoring_zone(id) ON DELETE SET NULL,
  timestamp_start numeric(12,3) NOT NULL,
  timestamp_end numeric(12,3),
  bounding_box jsonb,
  frame_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status text NOT NULL DEFAULT 'PENDING',
  reviewed_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  escalated_to_incident_id uuid REFERENCES incident(id) ON DELETE SET NULL,
  model_id uuid REFERENCES ai_model(id) ON DELETE SET NULL,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT detection_confidence_ck CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT detection_timestamp_order_ck CHECK (timestamp_end IS NULL OR timestamp_end >= timestamp_start)
);

CREATE INDEX IF NOT EXISTS detection_media_asset_idx ON detection (media_asset_id);
CREATE INDEX IF NOT EXISTS detection_camera_idx ON detection (camera_id);
CREATE INDEX IF NOT EXISTS detection_review_status_idx ON detection (review_status);

CREATE TABLE IF NOT EXISTS monitoring_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  camera_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  zone_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  alerts_handled integer NOT NULL DEFAULT 0,
  detections_reviewed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_session_time_ck CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS monitoring_session_operator_idx ON monitoring_session (operator_user_id);

CREATE TABLE IF NOT EXISTS operator_shift (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  zone_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  shift_start timestamptz NOT NULL,
  shift_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'SCHEDULED',
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_shift_time_ck CHECK (shift_end > shift_start)
);

CREATE INDEX IF NOT EXISTS operator_shift_operator_idx ON operator_shift (operator_user_id);

CREATE TABLE IF NOT EXISTS evidence_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_officer_id uuid NOT NULL REFERENCES law_enforcement_officer(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  description text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'REQUESTED',
  assigned_to_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  fulfillment_notes text,
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_request_fulfilled_time_ck CHECK (fulfilled_at IS NULL OR fulfilled_at >= requested_at)
);

CREATE TABLE IF NOT EXISTS case_share_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  shared_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  target_agency text NOT NULL,
  integration_id uuid REFERENCES external_integration(id) ON DELETE SET NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_hash text NOT NULL,
  sharing_agreement_ref text,
  shared_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  rollout_percentage numeric(10,4),
  updated_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flag_rollout_ck CHECK (rollout_percentage IS NULL OR (rollout_percentage >= 0 AND rollout_percentage <= 1))
);

CREATE TABLE IF NOT EXISTS operational_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  title text NOT NULL,
  date_range_start timestamptz,
  date_range_end timestamptz,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_url text,
  file_hash text,
  format text,
  generated_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'GENERATING',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_report_range_ck CHECK (date_range_end IS NULL OR date_range_start IS NULL OR date_range_end >= date_range_start)
);

CREATE TABLE IF NOT EXISTS infrastructure_environment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  environment_type text NOT NULL,
  region text,
  status text NOT NULL DEFAULT 'PROVISIONING',
  services jsonb NOT NULL DEFAULT '{}'::jsonb,
  infrastructure_template_version text,
  provisioned_at timestamptz,
  last_deployment_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_instance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  environment_id uuid NOT NULL REFERENCES infrastructure_environment(id) ON DELETE CASCADE,
  version text NOT NULL,
  instance_count integer NOT NULL DEFAULT 1,
  min_instances integer NOT NULL DEFAULT 1,
  max_instances integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'RUNNING',
  health_check_url text,
  last_health_check_at timestamptz,
  resource_allocation jsonb NOT NULL DEFAULT '{}'::jsonb,
  scaling_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_instance_counts_ck CHECK (min_instances >= 0 AND max_instances >= min_instances AND instance_count >= min_instances AND instance_count <= max_instances)
);

CREATE INDEX IF NOT EXISTS service_instance_environment_idx ON service_instance (environment_id);

CREATE TABLE IF NOT EXISTS scaling_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_instance_id uuid REFERENCES service_instance(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  environment_id uuid REFERENCES infrastructure_environment(id) ON DELETE SET NULL,
  direction text NOT NULL,
  trigger_metric text NOT NULL,
  trigger_value numeric(18,6),
  threshold numeric(18,6),
  from_count integer NOT NULL,
  to_count integer NOT NULL,
  status text NOT NULL DEFAULT 'INITIATED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disaster_recovery_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL,
  trigger_reason text,
  source_environment_id uuid REFERENCES infrastructure_environment(id) ON DELETE SET NULL,
  target_environment_id uuid REFERENCES infrastructure_environment(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'INITIATED',
  failover_started_at timestamptz,
  failover_completed_at timestamptz,
  restoration_started_at timestamptz,
  restoration_completed_at timestamptz,
  data_loss_window text,
  initiated_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS network_security_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid REFERENCES infrastructure_environment(id) ON DELETE SET NULL,
  rule_name text NOT NULL,
  direction text NOT NULL,
  protocol text,
  source_cidr text,
  destination_cidr text,
  port_range text,
  action text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_annotation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id uuid NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  annotation_type text NOT NULL,
  value text NOT NULL,
  timestamp_start numeric(12,3),
  timestamp_end numeric(12,3),
  bounding_box jsonb,
  confidence numeric(10,4),
  source text NOT NULL DEFAULT 'MANUAL',
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_annotation_confidence_ck CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT media_annotation_timestamp_ck CHECK (timestamp_end IS NULL OR timestamp_start IS NULL OR timestamp_end >= timestamp_start)
);

CREATE TABLE IF NOT EXISTS case_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  title text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_url text NOT NULL,
  file_hash text NOT NULL,
  format text NOT NULL,
  is_signed boolean NOT NULL DEFAULT false,
  generated_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sighting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_track_id uuid NOT NULL REFERENCES entity_track(id) ON DELETE CASCADE,
  entity_profile_id uuid NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  camera_id text,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  zone_id uuid REFERENCES monitoring_zone(id) ON DELETE SET NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  detection_id uuid REFERENCES detection(id) ON DELETE SET NULL,
  re_id_confidence numeric(10,4),
  dwell_duration_seconds integer,
  direction text,
  speed_estimate_mps numeric(18,6),
  frame_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sighting_reid_confidence_ck CHECK (re_id_confidence IS NULL OR (re_id_confidence >= 0 AND re_id_confidence <= 1))
);

CREATE INDEX IF NOT EXISTS sighting_track_idx ON sighting (entity_track_id);
CREATE INDEX IF NOT EXISTS sighting_entity_idx ON sighting (entity_profile_id);

CREATE TABLE IF NOT EXISTS track_segment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_track_id uuid NOT NULL REFERENCES entity_track(id) ON DELETE CASCADE,
  from_sighting_id uuid REFERENCES sighting(id) ON DELETE SET NULL,
  to_sighting_id uuid REFERENCES sighting(id) ON DELETE SET NULL,
  distance_meters numeric(18,6),
  duration_seconds integer,
  speed_mps numeric(18,6),
  is_interpolated boolean NOT NULL DEFAULT false,
  confidence numeric(10,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT track_segment_duration_ck CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT track_segment_confidence_ck CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE TABLE IF NOT EXISTS movement_pattern (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id uuid REFERENCES entity_profile(id) ON DELETE SET NULL,
  zone_id uuid REFERENCES monitoring_zone(id) ON DELETE SET NULL,
  pattern_type text NOT NULL,
  description text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  frequency integer NOT NULL DEFAULT 0,
  confidence numeric(10,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT movement_pattern_confidence_ck CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE TABLE IF NOT EXISTS source_file (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  file_type text NOT NULL,
  file_url text NOT NULL,
  file_hash text NOT NULL,
  mime_type text,
  file_size bigint,
  camera_params jsonb,
  gps_location jsonb,
  capture_timestamp timestamptz,
  processing_status text NOT NULL DEFAULT 'PENDING',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scene_annotation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  annotation_type text NOT NULL,
  title text NOT NULL,
  description text,
  position_3d jsonb NOT NULL DEFAULT '{}'::jsonb,
  normal_vector jsonb,
  linked_evidence_id text,
  icon text,
  color text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edge_sync_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id uuid NOT NULL REFERENCES edge_node(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  payload_size_bytes bigint NOT NULL DEFAULT 0,
  items_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  payload_hash text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edge_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id uuid NOT NULL UNIQUE REFERENCES edge_node(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_from timestamptz,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework text NOT NULL,
  check_type text NOT NULL,
  status text NOT NULL,
  findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  next_check_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_classification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL UNIQUE,
  rank integer NOT NULL UNIQUE,
  description text,
  allowed_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  handling_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  retention_override_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL,
  scope text NOT NULL,
  status text NOT NULL DEFAULT 'SCHEDULED',
  file_url text,
  file_size_bytes bigint,
  file_hash text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_backup_time_ck CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);
