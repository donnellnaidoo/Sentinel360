-- ============================================================================
-- Migration: 20260613000010_rls_policies.sql
-- Purpose:  Row Level Security (RLS) policies for all Sentinel360 tables.
--           Enables RLS on every table and creates granular policies based
--           on user roles: community, security, leo, admin, super_admin.
-- Domain:   Authorization & Governance
-- Applied:  2026-06-13
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1: Helper Functions
-- ════════════════════════════════════════════════════════════════════════════

-- ── get_user_role(): Returns the current user's role from JWT or session ─────
-- Supabase exposes the user's role via auth.jwt() -> 'user_role'
-- Falls back to the 'role' column on the user table for direct DB access.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb ->> 'user_role',
      (SELECT "role" FROM "user" WHERE id = auth.uid()::text LIMIT 1),
      'community'
    ),
    ''
  );
$$;

-- ── Role-check helper functions ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role() IN ('admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_leo()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role() IN ('leo', 'admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_security()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role() IN ('security', 'leo', 'admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_community()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role() = 'community';
$$;

-- ── auth.uid() wrapper for UUID compatibility ────────────────────────────────
-- Returns the current authenticated user's ID as TEXT for comparison with
-- TEXT-based user ID columns (better-auth uses TEXT primary keys).
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid()::text;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2: Enable RLS on ALL Tables
-- ════════════════════════════════════════════════════════════════════════════

-- Users & Auth Domain
ALTER TABLE IF EXISTS "user"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "session"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "account"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "verification"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization         ENABLE ROW LEVEL SECURITY;

-- RBAC Domain
ALTER TABLE IF EXISTS "role"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permission           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_role            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permission      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS data_classification  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_setting       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_policy      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS retention_policy     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feature_flag         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS law_enforcement_officer        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS officer_verification            ENABLE ROW LEVEL SECURITY;

-- Criminal Profiles Domain
ALTER TABLE IF EXISTS criminal_profile             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_biometric            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_photo                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_alias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_known_associate      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_last_location        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_threat_assessment    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entity_profile               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS face_detection               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plate_detection              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS person_attribute             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS watchlist_entry              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entity_match                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entity_track                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movement_timeline            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS track_segment                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movement_pattern             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movement_pattern_analysis    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movement_prediction          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS geofence                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS geofence_violation           ENABLE ROW LEVEL SECURITY;

-- Cases Domain
ALTER TABLE IF EXISTS cases                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incident                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_incident                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_criminal                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_evidence                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_timeline_entry          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_activity_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_note                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_report                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_share_record            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dispatch_request             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS camera                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS monitoring_zone              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS operational_report           ENABLE ROW LEVEL SECURITY;

-- Evidence Domain
ALTER TABLE IF EXISTS evidence                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidence_chain_of_custody    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidence_tag                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidence_integrity_check     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidence_request             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS media_asset                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS media_metadata               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS media_transcoded_variant     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS media_retention_record       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS media_annotation             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alpr_record                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reconstruction_project       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reconstruction_asset         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS source_file                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidence_marker              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scene_measurement            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scene_annotation             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS external_integration         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_config               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS api_key                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS integration_export_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS integration_import_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS integration_health           ENABLE ROW LEVEL SECURITY;

-- Sightings Domain
ALTER TABLE IF EXISTS sighting                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS community_sighting           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sighting_media               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sighting_verification        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS anonymous_tip                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS community_feed_item          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sighting_comment             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS community_interaction        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS community_preference         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS moderation_review            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS surveillance_sighting        ENABLE ROW LEVEL SECURITY;

-- Alerts Domain
ALTER TABLE IF EXISTS alert                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alert_recipient              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alert_delivery_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alert_routing_rule           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_preference      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alert_acknowledgment         ENABLE ROW LEVEL SECURITY;

-- AI/ML Domain
ALTER TABLE IF EXISTS ai_model                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_model_version             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_inference_result          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS detection_configuration      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS detection                    ENABLE ROW LEVEL SECURITY;

-- Monitoring & Operations
ALTER TABLE IF EXISTS monitoring_session           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS operator_shift               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS edge_node                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS edge_model_deployment        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS edge_node_config             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS edge_configuration           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS edge_sync_record             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS edge_health_metric           ENABLE ROW LEVEL SECURITY;

-- Audit & Compliance Domain
ALTER TABLE IF EXISTS audit_log                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS compliance_report            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS compliance_check             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_backup                ENABLE ROW LEVEL SECURITY;

-- Infrastructure Domain
ALTER TABLE IF EXISTS infrastructure_environment   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_instance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scaling_event                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disaster_recovery_event      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS network_security_rule        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deployment_record            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS infrastructure_event         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS emergency_operation_log      ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 3: User & Auth Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── user: Users read own; admin+ read all; super_admin write all ────────────

CREATE POLICY IF NOT EXISTS user_select_own ON "user"
  FOR SELECT
  USING (id = public.current_user_id());

CREATE POLICY IF NOT EXISTS user_select_admin ON "user"
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS user_insert_super_admin ON "user"
  FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY IF NOT EXISTS user_update_own ON "user"
  FOR UPDATE
  USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

CREATE POLICY IF NOT EXISTS user_update_admin ON "user"
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS user_delete_super_admin ON "user"
  FOR DELETE
  USING (public.is_super_admin());

-- ── session: Users see own sessions; admin+ see all ─────────────────────────

CREATE POLICY IF NOT EXISTS session_select_own ON "session"
  FOR SELECT
  USING (user_id = public.current_user_id());

CREATE POLICY IF NOT EXISTS session_select_admin ON "session"
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS session_delete_own ON "session"
  FOR DELETE
  USING (user_id = public.current_user_id());

CREATE POLICY IF NOT EXISTS session_delete_admin ON "session"
  FOR DELETE
  USING (public.is_admin());

-- ── account: Users see own accounts; admin+ see all ─────────────────────────

CREATE POLICY IF NOT EXISTS account_select_own ON "account"
  FOR SELECT
  USING (user_id = public.current_user_id());

CREATE POLICY IF NOT EXISTS account_select_admin ON "account"
  FOR SELECT
  USING (public.is_admin());

-- ── verification: Only super_admin can manage verifications ─────────────────

CREATE POLICY IF NOT EXISTS verification_select_admin ON "verification"
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS verification_all_super_admin ON "verification"
  FOR ALL
  USING (public.is_super_admin());

-- ── organization: All authenticated users can read; admin+ can manage ───────

CREATE POLICY IF NOT EXISTS organization_select_all ON organization
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS organization_insert_admin ON organization
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS organization_update_admin ON organization
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS organization_delete_admin ON organization
  FOR DELETE
  USING (public.is_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 4: RBAC Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── role: Read-only for all authenticated; admin+ can manage ────────────────

CREATE POLICY IF NOT EXISTS role_select_all ON "role"
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS role_all_admin ON "role"
  FOR ALL
  USING (public.is_admin());

-- ── permission: Read-only for all authenticated; admin+ can manage ──────────

CREATE POLICY IF NOT EXISTS permission_select_all ON permission
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS permission_all_admin ON permission
  FOR ALL
  USING (public.is_admin());

-- ── user_role / role_permission: Read for leo+; manage for admin+ ──────────

CREATE POLICY IF NOT EXISTS user_role_select_leo ON user_role
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS user_role_all_admin ON user_role
  FOR ALL
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS role_permission_select_leo ON role_permission
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS role_permission_all_admin ON role_permission
  FOR ALL
  USING (public.is_admin());

-- ── data_classification: Read for all authenticated; admin+ can manage ──────

CREATE POLICY IF NOT EXISTS data_classification_select_all ON data_classification
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS data_classification_all_admin ON data_classification
  FOR ALL
  USING (public.is_admin());

-- ── system_configuration / system_setting: Read for leo+; admin+ manage ────

CREATE POLICY IF NOT EXISTS system_config_read_leo ON system_configuration
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS system_config_all_admin ON system_configuration
  FOR ALL
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS system_setting_read_leo ON system_setting
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS system_setting_all_admin ON system_setting
  FOR ALL
  USING (public.is_admin());

-- ── security_policy / retention_policy / feature_flag: leo+ read; admin+ ────

CREATE POLICY IF NOT EXISTS security_policy_select_leo ON security_policy
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS security_policy_all_admin ON security_policy
  FOR ALL
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS retention_policy_select_leo ON retention_policy
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS retention_policy_all_admin ON retention_policy
  FOR ALL
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS feature_flag_select_leo ON feature_flag
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS feature_flag_all_admin ON feature_flag
  FOR ALL
  USING (public.is_admin());

-- ── law_enforcement_officer / officer_verification: leo+ read own; admin+ ───

CREATE POLICY IF NOT EXISTS leo_select_own ON law_enforcement_officer
  FOR SELECT
  USING (user_id = public.current_user_id() OR public.is_leo());

CREATE POLICY IF NOT EXISTS leo_all_admin ON law_enforcement_officer
  FOR ALL
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS officer_verification_select_leo ON officer_verification
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS officer_verification_all_admin ON officer_verification
  FOR ALL
  USING (public.is_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 5: Criminal Profile Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── criminal_profile:
--     Public sees: is_public = true AND status = 'active'
--     Security sees: all non-deleted
--     LEO+ sees: all including soft-deleted (for investigation)
--     Admin+: full access ─────────────────────────────────────────────────────

CREATE POLICY IF NOT EXISTS criminal_profile_select_public ON criminal_profile
  FOR SELECT
  USING (is_public = true AND status = 'active' AND deleted_at IS NULL);

CREATE POLICY IF NOT EXISTS criminal_profile_select_security ON criminal_profile
  FOR SELECT
  USING (public.is_security());

CREATE POLICY IF NOT EXISTS criminal_profile_select_leo ON criminal_profile
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS criminal_profile_insert_leo ON criminal_profile
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS criminal_profile_update_leo ON criminal_profile
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS criminal_profile_delete_admin ON criminal_profile
  FOR DELETE
  USING (public.is_admin());

-- ── profile_biometric: Only LEO+ can read/write (sensitive biometric data) ──

CREATE POLICY IF NOT EXISTS profile_biometric_select_leo ON profile_biometric
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS profile_biometric_insert_leo ON profile_biometric
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS profile_biometric_update_leo ON profile_biometric
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS profile_biometric_delete_admin ON profile_biometric
  FOR DELETE
  USING (public.is_admin());

-- ── profile_photo: Public sees profile photos for active public profiles;
--     LEO+ sees all; admin+ manages ──────────────────────────────────────────

CREATE POLICY IF NOT EXISTS profile_photo_select_public ON profile_photo
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM criminal_profile cp
    WHERE cp.id = profile_id
      AND cp.is_public = true
      AND cp.status = 'active'
      AND cp.deleted_at IS NULL
  ));

CREATE POLICY IF NOT EXISTS profile_photo_select_leo ON profile_photo
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS profile_photo_insert_leo ON profile_photo
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS profile_photo_update_leo ON profile_photo
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS profile_photo_delete_admin ON profile_photo
  FOR DELETE
  USING (public.is_admin());

-- ── profile_alias: Same pattern as profile_photo ────────────────────────────

CREATE POLICY IF NOT EXISTS profile_alias_select_public ON profile_alias
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM criminal_profile cp
    WHERE cp.id = profile_id
      AND cp.is_public = true
      AND cp.status = 'active'
      AND cp.deleted_at IS NULL
  ));

CREATE POLICY IF NOT EXISTS profile_alias_select_leo ON profile_alias
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS profile_alias_insert_leo ON profile_alias
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS profile_alias_update_leo ON profile_alias
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS profile_alias_delete_admin ON profile_alias
  FOR DELETE
  USING (public.is_admin());

-- ── profile_known_associate: LEO+ read/write; admin+ delete ─────────────────

CREATE POLICY IF NOT EXISTS known_associate_select_leo ON profile_known_associate
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS known_associate_insert_leo ON profile_known_associate
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS known_associate_update_leo ON profile_known_associate
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS known_associate_delete_admin ON profile_known_associate
  FOR DELETE
  USING (public.is_admin());

-- ── profile_last_location: LEO+ read/write ─────────────────────────────────

CREATE POLICY IF NOT EXISTS last_location_select_leo ON profile_last_location
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS last_location_insert_leo ON profile_last_location
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS last_location_update_leo ON profile_last_location
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS last_location_delete_admin ON profile_last_location
  FOR DELETE
  USING (public.is_admin());

-- ── profile_threat_assessment: LEO+ read/write; admin+ delete ───────────────

CREATE POLICY IF NOT EXISTS threat_assessment_select_leo ON profile_threat_assessment
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS threat_assessment_insert_leo ON profile_threat_assessment
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS threat_assessment_update_leo ON profile_threat_assessment
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS threat_assessment_delete_admin ON profile_threat_assessment
  FOR DELETE
  USING (public.is_admin());

-- ── entity_profile: Security+ can read; LEO+ can write; admin+ delete ──────

CREATE POLICY IF NOT EXISTS entity_profile_select_security ON entity_profile
  FOR SELECT
  USING (public.is_security());

CREATE POLICY IF NOT EXISTS entity_profile_insert_leo ON entity_profile
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS entity_profile_update_leo ON entity_profile
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS entity_profile_delete_admin ON entity_profile
  FOR DELETE
  USING (public.is_admin());

-- ── face_detection / plate_detection: Security+ read; LEO+ write ────────────

CREATE POLICY IF NOT EXISTS face_detection_select_security ON face_detection
  FOR SELECT
  USING (public.is_security());

CREATE POLICY IF NOT EXISTS face_detection_insert_leo ON face_detection
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS face_detection_delete_admin ON face_detection
  FOR DELETE
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS plate_detection_select_security ON plate_detection
  FOR SELECT
  USING (public.is_security());

CREATE POLICY IF NOT EXISTS plate_detection_insert_leo ON plate_detection
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS plate_detection_delete_admin ON plate_detection
  FOR DELETE
  USING (public.is_admin());

-- ── watchlist_entry: LEO+ read/write; admin+ delete ─────────────────────────

CREATE POLICY IF NOT EXISTS watchlist_entry_select_leo ON watchlist_entry
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS watchlist_entry_insert_leo ON watchlist_entry
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS watchlist_entry_update_leo ON watchlist_entry
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS watchlist_entry_delete_admin ON watchlist_entry
  FOR DELETE
  USING (public.is_admin());

-- ── Remaining entity/intelligence tables: LEO+ read; admin+ write ───────────

CREATE POLICY IF NOT EXISTS entity_match_select_leo ON entity_match
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS entity_match_insert_leo ON entity_match
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS entity_match_delete_admin ON entity_match
  FOR DELETE USING (public.is_admin());

CREATE POLICY IF NOT EXISTS entity_track_select_security ON entity_track
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS entity_track_insert_leo ON entity_track
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS entity_track_update_leo ON entity_track
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS movement_timeline_select_security ON movement_timeline
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS movement_timeline_insert_leo ON movement_timeline
  FOR INSERT WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS track_segment_select_security ON track_segment
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS track_segment_insert_leo ON track_segment
  FOR INSERT WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS movement_pattern_select_leo ON movement_pattern
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS movement_pattern_insert_leo ON movement_pattern
  FOR INSERT WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS movement_pattern_analysis_select_leo ON movement_pattern_analysis
  FOR SELECT USING (public.is_leo());

CREATE POLICY IF NOT EXISTS movement_prediction_select_leo ON movement_prediction
  FOR SELECT USING (public.is_leo());

-- ── geofence / geofence_violation: Security+ read; LEO+ write; admin+ delete ─

CREATE POLICY IF NOT EXISTS geofence_select_security ON geofence
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS geofence_insert_leo ON geofence
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS geofence_update_leo ON geofence
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS geofence_delete_admin ON geofence
  FOR DELETE USING (public.is_admin());

CREATE POLICY IF NOT EXISTS geofence_violation_select_leo ON geofence_violation
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS geofence_violation_insert_leo ON geofence_violation
  FOR INSERT WITH CHECK (public.is_leo());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 6: Cases & Incident Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── cases: LEO+ for assigned; admin+ for all ────────────────────────────────

CREATE POLICY IF NOT EXISTS cases_select_leo ON cases
  FOR SELECT
  USING (
    public.is_leo()
    AND (
      assigned_investigator::text = public.current_user_id()
      OR public.is_admin()
    )
  );

CREATE POLICY IF NOT EXISTS cases_select_admin ON cases
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS cases_insert_leo ON cases
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS cases_update_leo ON cases
  FOR UPDATE
  USING (
    public.is_leo()
    AND (
      assigned_investigator::text = public.current_user_id()
      OR public.is_admin()
    )
  )
  WITH CHECK (
    public.is_leo()
    AND (
      assigned_investigator::text = public.current_user_id()
      OR public.is_admin()
    )
  );

CREATE POLICY IF NOT EXISTS cases_delete_admin ON cases
  FOR DELETE
  USING (public.is_admin());

-- ── incident: Security+ read; LEO+ write; admin+ delete ─────────────────────

CREATE POLICY IF NOT EXISTS incident_select_security ON incident
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS incident_insert_leo ON incident
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS incident_update_leo ON incident
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS incident_delete_admin ON incident
  FOR DELETE USING (public.is_admin());

-- ── case_criminal / case_evidence / case_timeline_entry / case_activity_log
--     case_note / case_report: Inherit from cases — LEO+ for assigned, admin+ all

CREATE POLICY IF NOT EXISTS case_criminal_select_leo ON case_criminal
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS case_criminal_insert_leo ON case_criminal
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS case_criminal_delete_admin ON case_criminal
  FOR DELETE USING (public.is_admin());

CREATE POLICY IF NOT EXISTS case_evidence_select_leo ON case_evidence
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS case_evidence_insert_leo ON case_evidence
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS case_evidence_delete_admin ON case_evidence
  FOR DELETE USING (public.is_admin());

CREATE POLICY IF NOT EXISTS case_timeline_select_leo ON case_timeline_entry
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS case_timeline_insert_leo ON case_timeline_entry
  FOR INSERT WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS case_activity_log_select_leo ON case_activity_log
  FOR SELECT USING (public.is_leo());

CREATE POLICY IF NOT EXISTS case_note_select_leo ON case_note
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS case_note_insert_leo ON case_note
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS case_note_update_leo ON case_note
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS case_note_delete_admin ON case_note
  FOR DELETE USING (public.is_admin());

CREATE POLICY IF NOT EXISTS case_report_select_leo ON case_report
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS case_report_insert_leo ON case_report
  FOR INSERT WITH CHECK (public.is_leo());

-- ── dispatch_request: Security+ read; LEO+ write ────────────────────────────

CREATE POLICY IF NOT EXISTS dispatch_request_select_security ON dispatch_request
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS dispatch_request_insert_leo ON dispatch_request
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS dispatch_request_update_leo ON dispatch_request
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());

-- ── camera: Security+ read; LEO+ write; admin+ delete ───────────────────────

CREATE POLICY IF NOT EXISTS camera_select_security ON camera
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS camera_insert_admin ON camera
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS camera_update_admin ON camera
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS camera_delete_admin ON camera
  FOR DELETE USING (public.is_admin());

-- ── monitoring_zone: Security+ read; admin+ write ──────────────────────────

CREATE POLICY IF NOT EXISTS monitoring_zone_select_security ON monitoring_zone
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS monitoring_zone_insert_admin ON monitoring_zone
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS monitoring_zone_update_admin ON monitoring_zone
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── operational_report: LEO+ read their own; admin+ all ─────────────────────

CREATE POLICY IF NOT EXISTS operational_report_select_leo ON operational_report
  FOR SELECT
  USING (public.is_leo() AND (generated_by_user_id = public.current_user_id() OR public.is_admin()));
CREATE POLICY IF NOT EXISTS operational_report_insert_admin ON operational_report
  FOR INSERT WITH CHECK (public.is_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 7: Evidence Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── evidence: LEO+ can read/write; security can create (upload); community none

CREATE POLICY IF NOT EXISTS evidence_select_leo ON evidence
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS evidence_select_security ON evidence
  FOR SELECT
  USING (public.is_security());

CREATE POLICY IF NOT EXISTS evidence_insert_security ON evidence
  FOR INSERT
  WITH CHECK (public.is_security());

CREATE POLICY IF NOT EXISTS evidence_insert_leo ON evidence
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS evidence_update_leo ON evidence
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS evidence_delete_admin ON evidence
  FOR DELETE
  USING (public.is_admin());

-- ── evidence_chain_of_custody: LEO+ read; system/trigger writes (immutable) ─

CREATE POLICY IF NOT EXISTS evidence_chain_select_leo ON evidence_chain_of_custody
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS evidence_chain_insert_service ON evidence_chain_of_custody
  FOR INSERT
  WITH CHECK (public.is_leo());  -- Inserted by application logic, not direct user

-- ── evidence_tag: LEO+ read/write ───────────────────────────────────────────

CREATE POLICY IF NOT EXISTS evidence_tag_select_leo ON evidence_tag
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS evidence_tag_insert_leo ON evidence_tag
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS evidence_tag_delete_leo ON evidence_tag
  FOR DELETE USING (public.is_leo());

-- ── evidence_request: LEO+ read; admin+ write ───────────────────────────────

CREATE POLICY IF NOT EXISTS evidence_request_select_leo ON evidence_request
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS evidence_request_insert_leo ON evidence_request
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS evidence_request_update_admin ON evidence_request
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── media_asset: Security+ read; LEO+ write; admin+ delete ──────────────────

CREATE POLICY IF NOT EXISTS media_asset_select_security ON media_asset
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS media_asset_insert_leo ON media_asset
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS media_asset_update_leo ON media_asset
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS media_asset_delete_admin ON media_asset
  FOR DELETE USING (public.is_admin());

-- ── media_metadata / media_transcoded_variant / media_retention_record: Same ─

CREATE POLICY IF NOT EXISTS media_metadata_select_security ON media_metadata
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS media_metadata_insert_leo ON media_metadata
  FOR INSERT WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS media_variant_select_security ON media_transcoded_variant
  FOR SELECT USING (public.is_security());

CREATE POLICY IF NOT EXISTS media_retention_select_admin ON media_retention_record
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS media_retention_insert_admin ON media_retention_record
  FOR INSERT WITH CHECK (public.is_admin());

-- ── media_annotation: Security+ read; LEO+ write ───────────────────────────

CREATE POLICY IF NOT EXISTS media_annotation_select_security ON media_annotation
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS media_annotation_insert_leo ON media_annotation
  FOR INSERT WITH CHECK (public.is_leo());

-- ── alpr_record: Security+ read; LEO+ write ─────────────────────────────────

CREATE POLICY IF NOT EXISTS alpr_record_select_security ON alpr_record
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS alpr_record_insert_leo ON alpr_record
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS alpr_record_update_leo ON alpr_record
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS alpr_record_delete_admin ON alpr_record
  FOR DELETE USING (public.is_admin());

-- ── reconstruction / scene tables: LEO+ read/write; admin+ delete ───────────

CREATE POLICY IF NOT EXISTS reconstruction_project_select_leo ON reconstruction_project
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS reconstruction_project_insert_leo ON reconstruction_project
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS reconstruction_project_update_leo ON reconstruction_project
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS reconstruction_project_delete_admin ON reconstruction_project
  FOR DELETE USING (public.is_admin());

CREATE POLICY IF NOT EXISTS reconstruction_asset_select_leo ON reconstruction_asset
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS reconstruction_asset_insert_leo ON reconstruction_asset
  FOR INSERT WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS source_file_select_leo ON source_file
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS source_file_insert_leo ON source_file
  FOR INSERT WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS evidence_marker_select_leo ON evidence_marker
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS evidence_marker_insert_leo ON evidence_marker
  FOR INSERT WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS scene_measurement_select_leo ON scene_measurement
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS scene_measurement_insert_leo ON scene_measurement
  FOR INSERT WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS scene_annotation_select_leo ON scene_annotation
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS scene_annotation_insert_leo ON scene_annotation
  FOR INSERT WITH CHECK (public.is_leo());

-- ── external_integration / webhook_config / api_key: Admin+ only ────────────

CREATE POLICY IF NOT EXISTS integration_select_admin ON external_integration
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS integration_insert_admin ON external_integration
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS integration_update_admin ON external_integration
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS integration_delete_super_admin ON external_integration
  FOR DELETE USING (public.is_super_admin());

CREATE POLICY IF NOT EXISTS webhook_config_select_admin ON webhook_config
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS webhook_config_insert_admin ON webhook_config
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS api_key_select_super_admin ON api_key
  FOR SELECT USING (public.is_super_admin());
CREATE POLICY IF NOT EXISTS api_key_insert_super_admin ON api_key
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY IF NOT EXISTS integration_export_log_select_admin ON integration_export_log
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS integration_import_log_select_admin ON integration_import_log
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS integration_health_select_admin ON integration_health
  FOR SELECT USING (public.is_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 8: Sighting Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── sighting: Community sees own; LEO+ sees all pending/verified ────────────

CREATE POLICY IF NOT EXISTS sighting_select_own ON sighting
  FOR SELECT
  USING (submitted_by::text = public.current_user_id());

CREATE POLICY IF NOT EXISTS sighting_select_community_public ON sighting
  FOR SELECT
  USING (is_public = true AND status IN ('verified', 'actioned') AND deleted_at IS NULL);

CREATE POLICY IF NOT EXISTS sighting_select_security ON sighting
  FOR SELECT
  USING (public.is_security());

CREATE POLICY IF NOT EXISTS sighting_select_leo ON sighting
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS sighting_insert_community ON sighting
  FOR INSERT
  WITH CHECK (
    public.is_community()
    AND submitted_by::text = public.current_user_id()
  );

CREATE POLICY IF NOT EXISTS sighting_insert_security ON sighting
  FOR INSERT
  WITH CHECK (public.is_security());

CREATE POLICY IF NOT EXISTS sighting_insert_leo ON sighting
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS sighting_update_own ON sighting
  FOR UPDATE
  USING (submitted_by::text = public.current_user_id() AND status = 'pending')
  WITH CHECK (submitted_by::text = public.current_user_id() AND status = 'pending');

CREATE POLICY IF NOT EXISTS sighting_update_leo ON sighting
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS sighting_delete_admin ON sighting
  FOR DELETE
  USING (public.is_admin());

-- ── sighting_media: Inherit from sighting ───────────────────────────────────

CREATE POLICY IF NOT EXISTS sighting_media_select_own ON sighting_media
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sighting s
    WHERE s.id = sighting_id
      AND (s.submitted_by::text = public.current_user_id() OR s.is_public = true)
  ));

CREATE POLICY IF NOT EXISTS sighting_media_select_leo ON sighting_media
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS sighting_media_insert_own ON sighting_media
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM sighting s
    WHERE s.id = sighting_id AND s.submitted_by::text = public.current_user_id()
  ));

CREATE POLICY IF NOT EXISTS sighting_media_insert_leo ON sighting_media
  FOR INSERT
  WITH CHECK (public.is_leo());

-- ── sighting_verification: Only LEO+ can verify sightings ───────────────────

CREATE POLICY IF NOT EXISTS sighting_verification_select_leo ON sighting_verification
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS sighting_verification_insert_leo ON sighting_verification
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS sighting_verification_update_leo ON sighting_verification
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());

-- ── community_sighting: Community members see own; LEO+ see all ──────────────

CREATE POLICY IF NOT EXISTS community_sighting_select_own ON community_sighting
  FOR SELECT
  USING (reporter_user_id = public.current_user_id());

CREATE POLICY IF NOT EXISTS community_sighting_select_public ON community_sighting
  FOR SELECT
  USING (visibility = 'PUBLIC' AND status IN ('VERIFIED', 'ACTIONED'));

CREATE POLICY IF NOT EXISTS community_sighting_select_leo ON community_sighting
  FOR SELECT
  USING (public.is_leo());

CREATE POLICY IF NOT EXISTS community_sighting_insert_own ON community_sighting
  FOR INSERT
  WITH CHECK (reporter_user_id = public.current_user_id() OR public.is_security());

CREATE POLICY IF NOT EXISTS community_sighting_update_leo ON community_sighting
  FOR UPDATE
  USING (public.is_leo()) WITH CHECK (public.is_leo());

-- ── anonymous_tip: LEO+ read/write (anonymous submitter not tracked) ────────

CREATE POLICY IF NOT EXISTS anonymous_tip_select_leo ON anonymous_tip
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS anonymous_tip_insert_all ON anonymous_tip
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS anonymous_tip_update_leo ON anonymous_tip
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());

-- ── community_feed_item: All authenticated can read; LEO+ can write ─────────

CREATE POLICY IF NOT EXISTS community_feed_select_all ON community_feed_item
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS community_feed_insert_leo ON community_feed_item
  FOR INSERT WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS community_feed_update_leo ON community_feed_item
  FOR UPDATE USING (public.is_leo()) WITH CHECK (public.is_leo());
CREATE POLICY IF NOT EXISTS community_feed_delete_admin ON community_feed_item
  FOR DELETE USING (public.is_admin());

-- ── sighting_comment: Community can read/create on visible sightings ─────────

CREATE POLICY IF NOT EXISTS sighting_comment_select_public ON sighting_comment
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS sighting_comment_insert_own ON sighting_comment
  FOR INSERT
  WITH CHECK (author_id = public.current_user_id());
CREATE POLICY IF NOT EXISTS sighting_comment_delete_admin ON sighting_comment
  FOR DELETE USING (public.is_admin());

-- ── community_interaction: Users see own; admin+ see all ─────────────────────

CREATE POLICY IF NOT EXISTS community_interaction_select_own ON community_interaction
  FOR SELECT
  USING (user_id = public.current_user_id());
CREATE POLICY IF NOT EXISTS community_interaction_select_admin ON community_interaction
  FOR SELECT
  USING (public.is_admin());
CREATE POLICY IF NOT EXISTS community_interaction_insert_own ON community_interaction
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

-- ── community_preference: Users manage own preferences only ─────────────────

CREATE POLICY IF NOT EXISTS community_preference_select_own ON community_preference
  FOR SELECT
  USING (user_id = public.current_user_id());
CREATE POLICY IF NOT EXISTS community_preference_insert_own ON community_preference
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());
CREATE POLICY IF NOT EXISTS community_preference_update_own ON community_preference
  FOR UPDATE
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ── moderation_review: Admin+ only ───────────────────────────────────────────

CREATE POLICY IF NOT EXISTS moderation_review_select_admin ON moderation_review
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS moderation_review_insert_admin ON moderation_review
  FOR INSERT WITH CHECK (public.is_admin());

-- ── surveillance_sighting: Security+ read; system/LEO write ─────────────────

CREATE POLICY IF NOT EXISTS surveillance_sighting_select_security ON surveillance_sighting
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS surveillance_sighting_insert_leo ON surveillance_sighting
  FOR INSERT WITH CHECK (public.is_leo());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 9: Alert Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── alert: Users see alerts targeted to their role; LEO+ see broader scope;
--     admin+ see all ─────────────────────────────────────────────────────────

CREATE POLICY IF NOT EXISTS alert_select_community ON alert
  FOR SELECT
  USING (
    public.is_community()
    AND (target_role IS NULL OR target_role IN ('all', 'community'))
    AND deleted_at IS NULL
  );

CREATE POLICY IF NOT EXISTS alert_select_security ON alert
  FOR SELECT
  USING (
    public.is_security()
    AND (target_role IS NULL OR target_role IN ('all', 'community', 'security'))
    AND deleted_at IS NULL
  );

CREATE POLICY IF NOT EXISTS alert_select_leo ON alert
  FOR SELECT
  USING (
    public.is_leo()
    AND deleted_at IS NULL
  );

CREATE POLICY IF NOT EXISTS alert_select_admin ON alert
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS alert_insert_leo ON alert
  FOR INSERT
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS alert_update_leo ON alert
  FOR UPDATE
  USING (public.is_leo())
  WITH CHECK (public.is_leo());

CREATE POLICY IF NOT EXISTS alert_delete_admin ON alert
  FOR DELETE
  USING (public.is_admin());

-- ── alert_recipient: Users see their own alerts; admin+ see all ─────────────

CREATE POLICY IF NOT EXISTS alert_recipient_select_own ON alert_recipient
  FOR SELECT
  USING (user_id = public.current_user_id());

CREATE POLICY IF NOT EXISTS alert_recipient_select_admin ON alert_recipient
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS alert_recipient_update_own ON alert_recipient
  FOR UPDATE
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ── alert_delivery_log: Admin+ only ─────────────────────────────────────────

CREATE POLICY IF NOT EXISTS alert_delivery_log_select_admin ON alert_delivery_log
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS alert_delivery_log_insert_service ON alert_delivery_log
  FOR INSERT WITH CHECK (public.is_admin());

-- ── alert_routing_rule: Admin+ only ──────────────────────────────────────────

CREATE POLICY IF NOT EXISTS alert_routing_rule_select_admin ON alert_routing_rule
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS alert_routing_rule_insert_admin ON alert_routing_rule
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS alert_routing_rule_update_admin ON alert_routing_rule
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── notification: Users see own; admin+ see all ─────────────────────────────

CREATE POLICY IF NOT EXISTS notification_select_own ON notification
  FOR SELECT
  USING (recipient_user_id = public.current_user_id());
CREATE POLICY IF NOT EXISTS notification_select_admin ON notification
  FOR SELECT
  USING (public.is_admin());
CREATE POLICY IF NOT EXISTS notification_update_own ON notification
  FOR UPDATE
  USING (recipient_user_id = public.current_user_id())
  WITH CHECK (recipient_user_id = public.current_user_id());

-- ── notification_preference: Users manage own; admin+ manage all ────────────

CREATE POLICY IF NOT EXISTS notification_preference_select_own ON notification_preference
  FOR SELECT
  USING (user_id = public.current_user_id());
CREATE POLICY IF NOT EXISTS notification_preference_select_admin ON notification_preference
  FOR SELECT
  USING (public.is_admin());
CREATE POLICY IF NOT EXISTS notification_preference_insert_own ON notification_preference
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());
CREATE POLICY IF NOT EXISTS notification_preference_update_own ON notification_preference
  FOR UPDATE
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ── alert_acknowledgment: Users see own; admin+ see all ─────────────────────

CREATE POLICY IF NOT EXISTS alert_acknowledgment_select_own ON alert_acknowledgment
  FOR SELECT
  USING (user_id = public.current_user_id());
CREATE POLICY IF NOT EXISTS alert_acknowledgment_select_admin ON alert_acknowledgment
  FOR SELECT
  USING (public.is_admin());
CREATE POLICY IF NOT EXISTS alert_acknowledgment_insert_own ON alert_acknowledgment
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 10: AI/ML Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── ai_model / ai_model_version: LEO+ read; admin+ write ───────────────────

CREATE POLICY IF NOT EXISTS ai_model_select_leo ON ai_model
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS ai_model_insert_admin ON ai_model
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS ai_model_update_admin ON ai_model
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS ai_model_version_select_leo ON ai_model_version
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS ai_model_version_insert_admin ON ai_model_version
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS ai_model_version_update_admin ON ai_model_version
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── ai_inference_result: LEO+ read; system writes (via service account) ─────

CREATE POLICY IF NOT EXISTS ai_inference_result_select_leo ON ai_inference_result
  FOR SELECT USING (public.is_leo());
CREATE POLICY IF NOT EXISTS ai_inference_result_insert_service ON ai_inference_result
  FOR INSERT WITH CHECK (public.is_leo());

-- ── detection_configuration: Security+ read; admin+ write ───────────────────

CREATE POLICY IF NOT EXISTS detection_config_select_security ON detection_configuration
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS detection_config_insert_admin ON detection_configuration
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS detection_config_update_admin ON detection_configuration
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── detection: Security+ read; admin+ manage ────────────────────────────────

CREATE POLICY IF NOT EXISTS detection_select_security ON detection
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS detection_insert_admin ON detection
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS detection_update_admin ON detection
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 11: Monitoring & Operations Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── monitoring_session / operator_shift: Security+ read own; admin+ all ─────

CREATE POLICY IF NOT EXISTS monitoring_session_select_own ON monitoring_session
  FOR SELECT
  USING (operator_user_id = public.current_user_id() OR public.is_admin());
CREATE POLICY IF NOT EXISTS monitoring_session_insert_own ON monitoring_session
  FOR INSERT
  WITH CHECK (operator_user_id = public.current_user_id());
CREATE POLICY IF NOT EXISTS monitoring_session_update_own ON monitoring_session
  FOR UPDATE
  USING (operator_user_id = public.current_user_id())
  WITH CHECK (operator_user_id = public.current_user_id());

CREATE POLICY IF NOT EXISTS operator_shift_select_own ON operator_shift
  FOR SELECT
  USING (operator_user_id = public.current_user_id() OR public.is_admin());
CREATE POLICY IF NOT EXISTS operator_shift_insert_admin ON operator_shift
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS operator_shift_update_admin ON operator_shift
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── edge_node / edge_*: Security+ read; admin+ write; super_admin delete ────

CREATE POLICY IF NOT EXISTS edge_node_select_security ON edge_node
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS edge_node_insert_admin ON edge_node
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS edge_node_update_admin ON edge_node
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS edge_node_delete_super_admin ON edge_node
  FOR DELETE USING (public.is_super_admin());

CREATE POLICY IF NOT EXISTS edge_model_deployment_select_security ON edge_model_deployment
  FOR SELECT USING (public.is_security());
CREATE POLICY IF NOT EXISTS edge_model_deployment_insert_admin ON edge_model_deployment
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS edge_node_config_select_admin ON edge_node_config
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS edge_node_config_insert_admin ON edge_node_config
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS edge_configuration_select_admin ON edge_configuration
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS edge_configuration_insert_admin ON edge_configuration
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS edge_sync_record_select_admin ON edge_sync_record
  FOR SELECT USING (public.is_admin());

CREATE POLICY IF NOT EXISTS edge_health_metric_select_security ON edge_health_metric
  FOR SELECT USING (public.is_security());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 12: Audit & Compliance Policies
-- ════════════════════════════════════════════════════════════════════════════

-- ── audit_log: Super admin only (immutable, append-only) ────────────────────

CREATE POLICY IF NOT EXISTS audit_log_select_super_admin ON audit_log
  FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY IF NOT EXISTS audit_log_insert_service ON audit_log
  FOR INSERT
  WITH CHECK (public.is_super_admin());  -- App service inserts via service role

-- ── compliance_report / compliance_check: Admin+ only ───────────────────────

CREATE POLICY IF NOT EXISTS compliance_report_select_admin ON compliance_report
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS compliance_report_insert_admin ON compliance_report
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS compliance_check_select_admin ON compliance_check
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS compliance_check_insert_admin ON compliance_check
  FOR INSERT WITH CHECK (public.is_admin());

-- ── system_backup: Admin+ only ──────────────────────────────────────────────

CREATE POLICY IF NOT EXISTS system_backup_select_admin ON system_backup
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS system_backup_insert_admin ON system_backup
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY IF NOT EXISTS system_backup_update_admin ON system_backup
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 13: Infrastructure & Deployment Policies
-- ════════════════════════════════════════════════════════════════════════════

-- All infrastructure tables: Admin+ read; super_admin write/delete

CREATE POLICY IF NOT EXISTS infra_env_select_admin ON infrastructure_environment
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS infra_env_insert_super_admin ON infrastructure_environment
  FOR INSERT WITH CHECK (public.is_super_admin());
CREATE POLICY IF NOT EXISTS infra_env_update_super_admin ON infrastructure_environment
  FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY IF NOT EXISTS service_instance_select_admin ON service_instance
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS service_instance_insert_super_admin ON service_instance
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY IF NOT EXISTS scaling_event_select_admin ON scaling_event
  FOR SELECT USING (public.is_admin());

CREATE POLICY IF NOT EXISTS dr_event_select_admin ON disaster_recovery_event
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS dr_event_insert_super_admin ON disaster_recovery_event
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY IF NOT EXISTS network_security_rule_select_admin ON network_security_rule
  FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS network_security_rule_insert_super_admin ON network_security_rule
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY IF NOT EXISTS deployment_record_select_admin ON deployment_record
  FOR SELECT USING (public.is_admin());

CREATE POLICY IF NOT EXISTS infra_event_select_admin ON infrastructure_event
  FOR SELECT USING (public.is_admin());

CREATE POLICY IF NOT EXISTS emergency_operation_log_select_super_admin ON emergency_operation_log
  FOR SELECT USING (public.is_super_admin());
CREATE POLICY IF NOT EXISTS emergency_operation_log_insert_super_admin ON emergency_operation_log
  FOR INSERT WITH CHECK (public.is_super_admin());
