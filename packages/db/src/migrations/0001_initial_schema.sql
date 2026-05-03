CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  id text PRIMARY KEY,
  expires_at timestamp NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session" (user_id);

CREATE TABLE IF NOT EXISTS "account" (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp,
  refresh_token_expires_at timestamp,
  scope text,
  password text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account" (user_id);

CREATE TABLE IF NOT EXISTS "verification" (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification" (identifier);

CREATE TABLE IF NOT EXISTS "role" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "permission" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_role (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES "role"(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permission (
  role_id uuid NOT NULL REFERENCES "role"(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES "permission"(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS law_enforcement_officer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  badge_number text NOT NULL UNIQUE,
  department text,
  jurisdiction text,
  verification_status text NOT NULL DEFAULT 'PENDING',
  clearance_level text NOT NULL DEFAULT 'STANDARD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS officer_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  verifier_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  verification_status text NOT NULL,
  notes text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_setting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  setting_type text NOT NULL DEFAULT 'json',
  last_modified_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retention_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name text NOT NULL UNIQUE,
  retention_days integer NOT NULL,
  archive_days integer,
  deletion_days integer,
  applies_to_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name text NOT NULL UNIQUE,
  policy_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_entity_type text NOT NULL,
  target_entity_id text NOT NULL,
  moderation_status text NOT NULL,
  reason text,
  reviewed_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  description text,
  source text NOT NULL,
  source_camera_id text,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  file_hash text NOT NULL UNIQUE,
  storage_url text NOT NULL,
  storage_tier text NOT NULL DEFAULT 'HOT',
  duration integer,
  resolution text,
  codec text,
  framerate numeric(10,3),
  gps_latitude numeric(10,7),
  gps_longitude numeric(10,7),
  status text NOT NULL DEFAULT 'PROCESSING',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_asset_type_idx ON media_asset (type);
CREATE INDEX IF NOT EXISTS media_asset_source_idx ON media_asset (source);
CREATE INDEX IF NOT EXISTS media_asset_created_at_idx ON media_asset (created_at);

CREATE TABLE IF NOT EXISTS media_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id uuid NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  extracted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_transcoded_variant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id uuid NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  variant_label text NOT NULL,
  mime_type text NOT NULL,
  storage_url text NOT NULL,
  file_size bigint NOT NULL,
  resolution text,
  codec text,
  framerate numeric(10,3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_retention_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id uuid NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  retention_policy_id uuid REFERENCES retention_policy(id) ON DELETE SET NULL,
  archived_at timestamptz,
  deleted_at timestamptz,
  legal_hold_active boolean NOT NULL DEFAULT false,
  hold_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camera (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  device_type text,
  stream_url text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitoring_zone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  boundary_geojson jsonb NOT NULL DEFAULT '{}'::jsonb,
  threat_level text,
  assigned_camera_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_detection_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incident (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text NOT NULL UNIQUE,
  incident_type text NOT NULL,
  title text,
  description text NOT NULL,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz,
  severity text NOT NULL DEFAULT 'MEDIUM',
  status text NOT NULL DEFAULT 'REPORTED',
  source_domain text,
  source_entity_type text,
  source_entity_id text,
  reported_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incident_status_idx ON incident (status);
CREATE INDEX IF NOT EXISTS incident_severity_idx ON incident (severity);

CREATE TABLE IF NOT EXISTS "case" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_type text NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'MEDIUM',
  status text NOT NULL DEFAULT 'OPEN',
  assigned_to_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  closed_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_incident (
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, incident_id)
);

CREATE TABLE IF NOT EXISTS investigation_note (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  note_type text NOT NULL,
  content text NOT NULL,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  evidence_entity_type text NOT NULL,
  evidence_entity_id text NOT NULL,
  relationship_description text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatch_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incident(id) ON DELETE SET NULL,
  dispatch_type text NOT NULL,
  status text NOT NULL DEFAULT 'CREATED',
  assigned_to_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'MEDIUM',
  source_domain text,
  source_entity_type text,
  source_entity_id text,
  status text NOT NULL DEFAULT 'ACTIVE',
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedup_key text,
  dedup_window_seconds integer,
  escalation_level integer DEFAULT 0,
  escalation_sla_seconds integer,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_status_idx ON alert (status);
CREATE INDEX IF NOT EXISTS alert_severity_idx ON alert (severity);

CREATE TABLE IF NOT EXISTS notification_preference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  channel_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  digest_enabled boolean NOT NULL DEFAULT false,
  digest_frequency text,
  quiet_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  alert_type_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES alert(id) ON DELETE CASCADE,
  recipient_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  channel text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'PENDING',
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_acknowledgment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES alert(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  channel text,
  notes text,
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_routing_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalation_chain jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  domain text NOT NULL,
  actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'USER',
  target_entity_type text,
  target_entity_id text,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  entry_hash text NOT NULL UNIQUE,
  previous_hash text,
  status text NOT NULL DEFAULT 'COMPLETE',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_domain_idx ON audit_log (domain);
CREATE INDEX IF NOT EXISTS audit_log_event_type_idx ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at);

CREATE TABLE IF NOT EXISTS chain_of_custody (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_entity_type text NOT NULL,
  evidence_entity_id text NOT NULL,
  action text NOT NULL,
  from_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  to_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  reason text NOT NULL,
  evidence_hash text NOT NULL,
  location text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_integrity_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_entity_type text NOT NULL,
  evidence_entity_id text NOT NULL,
  computed_hash text NOT NULL,
  stored_hash text NOT NULL,
  is_valid boolean NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  report_type text NOT NULL,
  date_range_start timestamptz,
  date_range_end timestamptz,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_preference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  home_location jsonb NOT NULL DEFAULT '{}'::jsonb,
  alert_radius_km numeric(10,2) NOT NULL DEFAULT 5,
  privacy_level text NOT NULL DEFAULT 'PUBLIC',
  sighting_notifications_enabled boolean NOT NULL DEFAULT true,
  feed_notifications_enabled boolean NOT NULL DEFAULT true,
  push_alerts_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_sighting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  reporter_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  sighting_type text NOT NULL,
  title text,
  description text NOT NULL,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz,
  media_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'SUBMITTED',
  severity text,
  visibility text NOT NULL DEFAULT 'PUBLIC',
  operator_notes text,
  linked_incident_id uuid REFERENCES incident(id) ON DELETE SET NULL,
  moderation_status text NOT NULL DEFAULT 'PENDING',
  moderation_reason text,
  reported_at timestamptz,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS anonymous_tip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  content text NOT NULL,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'SUBMITTED',
  linked_case_id uuid REFERENCES "case"(id) ON DELETE SET NULL,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_feed_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_entity_type text,
  source_entity_id text,
  media_url text,
  radius_km numeric(10,2),
  is_pinned boolean NOT NULL DEFAULT false,
  helpful_count integer NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sighting_comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id uuid NOT NULL REFERENCES community_sighting(id) ON DELETE CASCADE,
  author_id text REFERENCES "user"(id) ON DELETE SET NULL,
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_interaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  target_entity_type text NOT NULL,
  target_entity_id text NOT NULL,
  interaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entity_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  display_name text,
  primary_face_image_url text,
  primary_face_embedding jsonb,
  known_plate_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  detection_count integer NOT NULL DEFAULT 0,
  locations_seen jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'ACTIVE',
  watchlist_status text NOT NULL DEFAULT 'NONE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS face_detection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id uuid REFERENCES entity_profile(id) ON DELETE SET NULL,
  media_asset_id uuid NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  camera_id text,
  embedding jsonb NOT NULL,
  face_image_url text,
  quality_score numeric(10,4),
  spatial_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plate_detection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id uuid REFERENCES entity_profile(id) ON DELETE SET NULL,
  media_asset_id uuid NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  camera_id text,
  plate_text text NOT NULL,
  confidence numeric(10,4),
  spatial_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS person_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  face_detection_id uuid NOT NULL REFERENCES face_detection(id) ON DELETE CASCADE,
  clothing_description text,
  gender_presentation text,
  estimated_age_range text,
  height_estimate text,
  accessories jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id uuid NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  priority_level text NOT NULL,
  reason text NOT NULL,
  case_id uuid REFERENCES "case"(id) ON DELETE SET NULL,
  expiry_date timestamptz,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entity_match (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id uuid REFERENCES entity_profile(id) ON DELETE SET NULL,
  source_entity_type text NOT NULL,
  source_entity_id text NOT NULL,
  similarity_score numeric(10,4) NOT NULL,
  matched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entity_track (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id uuid NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  track_status text NOT NULL DEFAULT 'ACTIVE',
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  movement_path_geojson jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_per_segment jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movement_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id uuid NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  time_range_start timestamptz,
  time_range_end timestamptz,
  timeline_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS geofence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  boundary_geojson jsonb NOT NULL DEFAULT '{}'::jsonb,
  rule text NOT NULL DEFAULT 'BOTH',
  entity_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS geofence_violation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id uuid NOT NULL REFERENCES geofence(id) ON DELETE CASCADE,
  entity_profile_id uuid REFERENCES entity_profile(id) ON DELETE SET NULL,
  violation_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movement_pattern_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id uuid NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  time_range_start timestamptz,
  time_range_end timestamptz,
  common_routes jsonb NOT NULL DEFAULT '[]'::jsonb,
  schedules jsonb NOT NULL DEFAULT '[]'::jsonb,
  anomalies jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movement_prediction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile_id uuid NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  predicted_locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_camera_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edge_node (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  device_type text,
  hardware_specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  network_address text,
  status text NOT NULL DEFAULT 'REGISTERED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edge_model_deployment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id uuid NOT NULL REFERENCES edge_node(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  model_version text NOT NULL,
  deployment_status text NOT NULL DEFAULT 'PENDING',
  deployed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edge_node_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id uuid NOT NULL UNIQUE REFERENCES edge_node(id) ON DELETE CASCADE,
  detection_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_thresholds jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edge_health_metric (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_node_id uuid NOT NULL REFERENCES edge_node(id) ON DELETE CASCADE,
  cpu_utilization numeric(10,4),
  memory_usage numeric(10,4),
  storage_usage numeric(10,4),
  temperature numeric(10,4),
  network_latency numeric(10,4),
  inference_fps numeric(10,4),
  inference_latency_ms numeric(10,4),
  reported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_integration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  integration_type text NOT NULL,
  endpoint_url text,
  auth_method text,
  data_format text,
  status text NOT NULL DEFAULT 'PENDING_VERIFICATION',
  test_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  url text NOT NULL,
  events_subscribed jsonb NOT NULL DEFAULT '[]'::jsonb,
  secret_key_hash text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_key (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  scope_permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  expiry_date timestamptz,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_export_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  export_type text NOT NULL,
  data_count integer NOT NULL DEFAULT 0,
  file_hash text,
  delivery_status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  import_type text NOT NULL,
  records_imported integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES external_integration(id) ON DELETE CASCADE,
  response_time_ms numeric(10,4),
  success_rate numeric(10,4),
  last_check_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconstruction_project (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_incident_id uuid REFERENCES incident(id) ON DELETE SET NULL,
  linked_case_id uuid REFERENCES "case"(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'SETUP',
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconstruction_asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  storage_url text NOT NULL,
  scale_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_marker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  evidence_type text,
  linked_evidence_type text,
  linked_evidence_id text,
  coordinates_3d jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scene_measurement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES reconstruction_project(id) ON DELETE CASCADE,
  measurement_type text NOT NULL,
  reference_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_value numeric(18,6) NOT NULL,
  unit text,
  accuracy_margin numeric(18,6),
  saved_as_annotation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deployment_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL,
  version text NOT NULL,
  status text NOT NULL,
  deployed_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS infrastructure_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emergency_operation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
