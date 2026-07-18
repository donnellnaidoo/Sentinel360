--
-- PostgreSQL database dump
--

\restrict biT20JimjqhO40IHWRLKhYBoTh6z0iOhEYOda5Youy5UEdSg0uKiull7w2McMPP

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp without time zone,
    refresh_token_expires_at timestamp without time zone,
    scope text,
    password text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_model; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_model (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_key text NOT NULL,
    display_name text NOT NULL,
    model_type text NOT NULL,
    current_version text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    severity text DEFAULT 'MEDIUM'::text NOT NULL,
    source_domain text,
    source_entity_type text,
    source_entity_id text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    dedup_key text,
    dedup_window_seconds integer,
    escalation_level integer DEFAULT 0,
    escalation_sla_seconds integer,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alert_acknowledgment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_acknowledgment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid NOT NULL,
    user_id text NOT NULL,
    channel text,
    notes text,
    acknowledged_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alert_routing_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_routing_rule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    severity_filter jsonb DEFAULT '{}'::jsonb NOT NULL,
    recipient_criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    channels jsonb DEFAULT '[]'::jsonb NOT NULL,
    escalation_chain jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: anonymous_tip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anonymous_tip (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_code text NOT NULL,
    content text NOT NULL,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    media_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'SUBMITTED'::text NOT NULL,
    linked_case_id uuid,
    review_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: api_key; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_key (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_id uuid NOT NULL,
    key_hash text NOT NULL,
    scope_permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    expiry_date timestamp with time zone,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    domain text NOT NULL,
    actor_id text,
    actor_type text DEFAULT 'USER'::text NOT NULL,
    target_entity_type text,
    target_entity_id text,
    action text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address text,
    user_agent text,
    entry_hash text NOT NULL,
    previous_hash text,
    status text DEFAULT 'COMPLETE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: camera; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.camera (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    device_type text,
    stream_url text,
    capabilities jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: case; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."case" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_number text NOT NULL,
    case_type text NOT NULL,
    title text NOT NULL,
    description text,
    priority text DEFAULT 'MEDIUM'::text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    assigned_to_user_id text,
    created_by_user_id text,
    closed_at timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: case_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    evidence_entity_type text NOT NULL,
    evidence_entity_id text NOT NULL,
    relationship_description text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: case_incident; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_incident (
    case_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: case_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_report (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    report_type text NOT NULL,
    title text NOT NULL,
    sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    file_url text NOT NULL,
    file_hash text NOT NULL,
    format text NOT NULL,
    is_signed boolean DEFAULT false NOT NULL,
    generated_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: case_share_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_share_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    shared_by_user_id text,
    target_agency text NOT NULL,
    integration_id uuid,
    scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    data_hash text NOT NULL,
    sharing_agreement_ref text,
    shared_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chain_of_custody; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chain_of_custody (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_entity_type text NOT NULL,
    evidence_entity_id text NOT NULL,
    action text NOT NULL,
    from_user_id text,
    to_user_id text,
    reason text NOT NULL,
    evidence_hash text NOT NULL,
    location text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_feed_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_feed_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_entity_type text,
    source_entity_id text,
    media_url text,
    radius_km numeric(10,2),
    is_pinned boolean DEFAULT false NOT NULL,
    helpful_count integer DEFAULT 0 NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_interaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_interaction (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    target_entity_type text NOT NULL,
    target_entity_id text NOT NULL,
    interaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_preference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_preference (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    home_location jsonb DEFAULT '{}'::jsonb NOT NULL,
    alert_radius_km numeric(10,2) DEFAULT 5 NOT NULL,
    privacy_level text DEFAULT 'PUBLIC'::text NOT NULL,
    sighting_notifications_enabled boolean DEFAULT true NOT NULL,
    feed_notifications_enabled boolean DEFAULT true NOT NULL,
    push_alerts_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_sighting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_sighting (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_code text NOT NULL,
    reporter_user_id text,
    sighting_type text NOT NULL,
    title text,
    description text NOT NULL,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone,
    media_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'SUBMITTED'::text NOT NULL,
    severity text,
    visibility text DEFAULT 'PUBLIC'::text NOT NULL,
    operator_notes text,
    linked_incident_id uuid,
    moderation_status text DEFAULT 'PENDING'::text NOT NULL,
    moderation_reason text,
    reported_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: compliance_check; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_check (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework text NOT NULL,
    check_type text NOT NULL,
    status text NOT NULL,
    findings jsonb DEFAULT '{}'::jsonb NOT NULL,
    recommendations jsonb DEFAULT '[]'::jsonb NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    checked_by_user_id text,
    next_check_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: compliance_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_report (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    report_type text NOT NULL,
    date_range_start timestamp with time zone,
    date_range_end timestamp with time zone,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_classification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_classification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level text NOT NULL,
    rank integer NOT NULL,
    description text,
    allowed_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    handling_requirements jsonb DEFAULT '{}'::jsonb NOT NULL,
    retention_override_days integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deployment_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deployment_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    environment text NOT NULL,
    version text NOT NULL,
    status text NOT NULL,
    deployed_by_user_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detection (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    detection_type text NOT NULL,
    classification text NOT NULL,
    confidence numeric(10,4) NOT NULL,
    severity text NOT NULL,
    media_asset_id uuid NOT NULL,
    camera_id uuid,
    detection_configuration_id uuid,
    zone_id uuid,
    timestamp_start numeric(12,3) NOT NULL,
    timestamp_end numeric(12,3),
    bounding_box jsonb,
    frame_url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    review_status text DEFAULT 'PENDING'::text NOT NULL,
    reviewed_by_user_id text,
    reviewed_at timestamp with time zone,
    escalated_to_incident_id uuid,
    model_id uuid,
    model_version text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT detection_confidence_ck CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT detection_timestamp_order_ck CHECK (((timestamp_end IS NULL) OR (timestamp_end >= timestamp_start)))
);


--
-- Name: detection_configuration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detection_configuration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    camera_id uuid,
    zone_id uuid,
    enabled_detection_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence_threshold numeric(10,4) DEFAULT 0.7 NOT NULL,
    sensitivity text DEFAULT 'MEDIUM'::text NOT NULL,
    regions_of_interest jsonb DEFAULT '[]'::jsonb NOT NULL,
    active_schedule jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id text,
    updated_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT detection_configuration_confidence_ck CHECK (((confidence_threshold >= (0)::numeric) AND (confidence_threshold <= (1)::numeric)))
);


--
-- Name: disaster_recovery_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disaster_recovery_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trigger_type text NOT NULL,
    trigger_reason text,
    source_environment_id uuid,
    target_environment_id uuid,
    status text DEFAULT 'INITIATED'::text NOT NULL,
    failover_started_at timestamp with time zone,
    failover_completed_at timestamp with time zone,
    restoration_started_at timestamp with time zone,
    restoration_completed_at timestamp with time zone,
    data_loss_window text,
    initiated_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dispatch_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispatch_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id uuid,
    dispatch_type text NOT NULL,
    status text DEFAULT 'CREATED'::text NOT NULL,
    assigned_to_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: edge_configuration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edge_configuration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edge_node_id uuid NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    effective_from timestamp with time zone,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: edge_health_metric; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edge_health_metric (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edge_node_id uuid NOT NULL,
    cpu_utilization numeric(10,4),
    memory_usage numeric(10,4),
    storage_usage numeric(10,4),
    temperature numeric(10,4),
    network_latency numeric(10,4),
    inference_fps numeric(10,4),
    inference_latency_ms numeric(10,4),
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: edge_model_deployment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edge_model_deployment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edge_node_id uuid NOT NULL,
    model_name text NOT NULL,
    model_version text NOT NULL,
    deployment_status text DEFAULT 'PENDING'::text NOT NULL,
    deployed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: edge_node; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edge_node (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    device_type text,
    hardware_specs jsonb DEFAULT '{}'::jsonb NOT NULL,
    network_address text,
    status text DEFAULT 'REGISTERED'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: edge_node_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edge_node_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edge_node_id uuid NOT NULL,
    detection_zones jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence_thresholds jsonb DEFAULT '{}'::jsonb NOT NULL,
    processing_schedule jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: edge_sync_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edge_sync_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edge_node_id uuid NOT NULL,
    sync_type text NOT NULL,
    payload_size_bytes bigint DEFAULT 0 NOT NULL,
    items_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    payload_hash text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: emergency_operation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_operation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    actor_user_id text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entity_match; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_match (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_profile_id uuid,
    source_entity_type text NOT NULL,
    source_entity_id text NOT NULL,
    similarity_score numeric(10,4) NOT NULL,
    matched_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entity_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    display_name text,
    primary_face_image_url text,
    primary_face_embedding jsonb,
    known_plate_numbers jsonb DEFAULT '[]'::jsonb NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    first_seen_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    detection_count integer DEFAULT 0 NOT NULL,
    locations_seen jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    watchlist_status text DEFAULT 'NONE'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entity_track; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_track (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_profile_id uuid NOT NULL,
    track_status text DEFAULT 'ACTIVE'::text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    movement_path_geojson jsonb DEFAULT '{}'::jsonb NOT NULL,
    confidence_per_segment jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: evidence_integrity_check; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_integrity_check (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_entity_type text NOT NULL,
    evidence_entity_id text NOT NULL,
    computed_hash text NOT NULL,
    stored_hash text NOT NULL,
    is_valid boolean NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: evidence_marker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_marker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    label text NOT NULL,
    description text,
    evidence_type text,
    linked_evidence_type text,
    linked_evidence_id text,
    coordinates_3d jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: evidence_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requesting_officer_id uuid NOT NULL,
    case_id uuid NOT NULL,
    request_type text NOT NULL,
    description text NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'REQUESTED'::text NOT NULL,
    assigned_to_user_id text,
    fulfillment_notes text,
    evidence_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    fulfilled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evidence_request_fulfilled_time_ck CHECK (((fulfilled_at IS NULL) OR (fulfilled_at >= requested_at)))
);


--
-- Name: external_integration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_integration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    integration_type text NOT NULL,
    endpoint_url text,
    auth_method text,
    data_format text,
    status text DEFAULT 'PENDING_VERIFICATION'::text NOT NULL,
    test_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: face_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.face_detection (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_profile_id uuid,
    media_asset_id uuid NOT NULL,
    camera_id text,
    embedding jsonb NOT NULL,
    face_image_url text,
    quality_score numeric(10,4),
    spatial_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_flag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flag (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT false NOT NULL,
    dependencies jsonb DEFAULT '[]'::jsonb NOT NULL,
    rollout_percentage numeric(10,4),
    updated_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feature_flag_rollout_ck CHECK (((rollout_percentage IS NULL) OR ((rollout_percentage >= (0)::numeric) AND (rollout_percentage <= (1)::numeric))))
);


--
-- Name: geofence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geofence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    boundary_geojson jsonb DEFAULT '{}'::jsonb NOT NULL,
    rule text DEFAULT 'BOTH'::text NOT NULL,
    entity_filter jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: geofence_violation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geofence_violation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    geofence_id uuid NOT NULL,
    entity_profile_id uuid,
    violation_type text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: incident; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_number text NOT NULL,
    incident_type text NOT NULL,
    title text,
    description text NOT NULL,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone,
    severity text DEFAULT 'MEDIUM'::text NOT NULL,
    status text DEFAULT 'REPORTED'::text NOT NULL,
    source_domain text,
    source_entity_type text,
    source_entity_id text,
    reported_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: infrastructure_environment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.infrastructure_environment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    environment_type text NOT NULL,
    region text,
    status text DEFAULT 'PROVISIONING'::text NOT NULL,
    services jsonb DEFAULT '{}'::jsonb NOT NULL,
    infrastructure_template_version text,
    provisioned_at timestamp with time zone,
    last_deployment_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: infrastructure_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.infrastructure_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    severity text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: integration_export_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_export_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_id uuid NOT NULL,
    export_type text NOT NULL,
    data_count integer DEFAULT 0 NOT NULL,
    file_hash text,
    delivery_status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: integration_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_health (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_id uuid NOT NULL,
    response_time_ms numeric(10,4),
    success_rate numeric(10,4),
    last_check_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: integration_import_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_import_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_id uuid NOT NULL,
    import_type text NOT NULL,
    records_imported integer DEFAULT 0 NOT NULL,
    records_failed integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: investigation_case; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investigation_case (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_number text NOT NULL,
    case_type text NOT NULL,
    title text NOT NULL,
    description text,
    priority text DEFAULT 'MEDIUM'::text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    assigned_to_user_id text,
    created_by_user_id text,
    closed_at timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: investigation_note; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investigation_note (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    note_type text NOT NULL,
    content text NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: law_enforcement_officer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.law_enforcement_officer (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    badge_number text NOT NULL,
    department text,
    jurisdiction text,
    verification_status text DEFAULT 'PENDING'::text NOT NULL,
    clearance_level text DEFAULT 'STANDARD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: media_annotation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_annotation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    media_asset_id uuid NOT NULL,
    annotation_type text NOT NULL,
    value text NOT NULL,
    timestamp_start numeric(12,3),
    timestamp_end numeric(12,3),
    bounding_box jsonb,
    confidence numeric(10,4),
    source text DEFAULT 'MANUAL'::text NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT media_annotation_confidence_ck CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))),
    CONSTRAINT media_annotation_timestamp_ck CHECK (((timestamp_end IS NULL) OR (timestamp_start IS NULL) OR (timestamp_end >= timestamp_start)))
);


--
-- Name: media_asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_asset (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    source text NOT NULL,
    source_camera_id text,
    original_filename text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    file_hash text NOT NULL,
    storage_url text NOT NULL,
    storage_tier text DEFAULT 'HOT'::text NOT NULL,
    duration integer,
    resolution text,
    codec text,
    framerate numeric(10,3),
    gps_latitude numeric(10,7),
    gps_longitude numeric(10,7),
    status text DEFAULT 'PROCESSING'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: media_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    media_asset_id uuid NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    extracted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: media_retention_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_retention_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    media_asset_id uuid NOT NULL,
    retention_policy_id uuid,
    archived_at timestamp with time zone,
    deleted_at timestamp with time zone,
    legal_hold_active boolean DEFAULT false NOT NULL,
    hold_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: media_transcoded_variant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_transcoded_variant (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    media_asset_id uuid NOT NULL,
    variant_label text NOT NULL,
    mime_type text NOT NULL,
    storage_url text NOT NULL,
    file_size bigint NOT NULL,
    resolution text,
    codec text,
    framerate numeric(10,3),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderation_review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_review (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_entity_type text NOT NULL,
    target_entity_id text NOT NULL,
    moderation_status text NOT NULL,
    reason text,
    reviewed_by_user_id text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: monitoring_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitoring_session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_user_id text NOT NULL,
    camera_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    zone_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    alerts_handled integer DEFAULT 0 NOT NULL,
    detections_reviewed integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT monitoring_session_time_ck CHECK (((ended_at IS NULL) OR (ended_at >= started_at)))
);


--
-- Name: monitoring_zone; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitoring_zone (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    boundary_geojson jsonb DEFAULT '{}'::jsonb NOT NULL,
    threat_level text,
    assigned_camera_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    default_detection_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movement_pattern; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movement_pattern (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_profile_id uuid,
    zone_id uuid,
    pattern_type text NOT NULL,
    description text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    frequency integer DEFAULT 0 NOT NULL,
    confidence numeric(10,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movement_pattern_confidence_ck CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))))
);


--
-- Name: movement_pattern_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movement_pattern_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_profile_id uuid NOT NULL,
    time_range_start timestamp with time zone,
    time_range_end timestamp with time zone,
    common_routes jsonb DEFAULT '[]'::jsonb NOT NULL,
    schedules jsonb DEFAULT '[]'::jsonb NOT NULL,
    anomalies jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movement_prediction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movement_prediction (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_profile_id uuid NOT NULL,
    predicted_locations jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence_scores jsonb DEFAULT '[]'::jsonb NOT NULL,
    target_camera_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movement_timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movement_timeline (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_profile_id uuid NOT NULL,
    time_range_start timestamp with time zone,
    time_range_end timestamp with time zone,
    timeline_entries jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: network_security_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.network_security_rule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    environment_id uuid,
    rule_name text NOT NULL,
    direction text NOT NULL,
    protocol text,
    source_cidr text,
    destination_cidr text,
    port_range text,
    action text NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid NOT NULL,
    recipient_user_id text NOT NULL,
    channel text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    delivery_status text DEFAULT 'PENDING'::text NOT NULL,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    action_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_preference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preference (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    channel_preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    digest_enabled boolean DEFAULT false NOT NULL,
    digest_frequency text,
    quiet_hours jsonb DEFAULT '{}'::jsonb NOT NULL,
    alert_type_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: officer_verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.officer_verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    officer_user_id text NOT NULL,
    verifier_user_id text,
    verification_status text NOT NULL,
    notes text,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: operational_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operational_report (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type text NOT NULL,
    title text NOT NULL,
    date_range_start timestamp with time zone,
    date_range_end timestamp with time zone,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    file_url text,
    file_hash text,
    format text,
    generated_by_user_id text,
    status text DEFAULT 'GENERATING'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT operational_report_range_ck CHECK (((date_range_end IS NULL) OR (date_range_start IS NULL) OR (date_range_end >= date_range_start)))
);


--
-- Name: operator_shift; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operator_shift (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_user_id text NOT NULL,
    zone_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    shift_start timestamp with time zone NOT NULL,
    shift_end timestamp with time zone NOT NULL,
    status text DEFAULT 'SCHEDULED'::text NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT operator_shift_time_ck CHECK ((shift_end > shift_start))
);


--
-- Name: permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: person_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_attributes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    face_detection_id uuid NOT NULL,
    clothing_description text,
    gender_presentation text,
    estimated_age_range text,
    height_estimate text,
    accessories jsonb DEFAULT '[]'::jsonb NOT NULL,
    extracted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plate_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plate_detection (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_profile_id uuid,
    media_asset_id uuid NOT NULL,
    camera_id text,
    plate_text text NOT NULL,
    confidence numeric(10,4),
    spatial_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reconstruction_asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconstruction_asset (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    asset_type text NOT NULL,
    storage_url text NOT NULL,
    scale_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    quality_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reconstruction_project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconstruction_project (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    linked_incident_id uuid,
    linked_case_id uuid,
    status text DEFAULT 'SETUP'::text NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: retention_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.retention_policy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_name text NOT NULL,
    retention_days integer NOT NULL,
    archive_days integer,
    deletion_days integer,
    applies_to_categories jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permission (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


--
-- Name: scaling_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scaling_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_instance_id uuid,
    service_name text NOT NULL,
    environment_id uuid,
    direction text NOT NULL,
    trigger_metric text NOT NULL,
    trigger_value numeric(18,6),
    threshold numeric(18,6),
    from_count integer NOT NULL,
    to_count integer NOT NULL,
    status text DEFAULT 'INITIATED'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scene_annotation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scene_annotation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    annotation_type text NOT NULL,
    title text NOT NULL,
    description text,
    position_3d jsonb DEFAULT '{}'::jsonb NOT NULL,
    normal_vector jsonb,
    linked_evidence_id text,
    icon text,
    color text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scene_measurement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scene_measurement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    measurement_type text NOT NULL,
    reference_points jsonb DEFAULT '[]'::jsonb NOT NULL,
    computed_value numeric(18,6) NOT NULL,
    unit text,
    accuracy_margin numeric(18,6),
    saved_as_annotation boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: security_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_policy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_name text NOT NULL,
    policy_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: service_instance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_instance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name text NOT NULL,
    environment_id uuid NOT NULL,
    version text NOT NULL,
    instance_count integer DEFAULT 1 NOT NULL,
    min_instances integer DEFAULT 1 NOT NULL,
    max_instances integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'RUNNING'::text NOT NULL,
    health_check_url text,
    last_health_check_at timestamp with time zone,
    resource_allocation jsonb DEFAULT '{}'::jsonb NOT NULL,
    scaling_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_instance_counts_ck CHECK (((min_instances >= 0) AND (max_instances >= min_instances) AND (instance_count >= min_instances) AND (instance_count <= max_instances)))
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL
);


--
-- Name: sighting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sighting (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_track_id uuid NOT NULL,
    entity_profile_id uuid NOT NULL,
    camera_id uuid,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    zone_id uuid,
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    detection_id uuid,
    re_id_confidence numeric(10,4),
    dwell_duration_seconds integer,
    direction text,
    speed_estimate_mps numeric(18,6),
    frame_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sighting_reid_confidence_ck CHECK (((re_id_confidence IS NULL) OR ((re_id_confidence >= (0)::numeric) AND (re_id_confidence <= (1)::numeric))))
);


--
-- Name: sighting_comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sighting_comment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sighting_id uuid NOT NULL,
    author_id text,
    comment_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: source_file; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_file (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    file_type text NOT NULL,
    file_url text NOT NULL,
    file_hash text NOT NULL,
    mime_type text,
    file_size bigint,
    camera_params jsonb,
    gps_location jsonb,
    capture_timestamp timestamp with time zone,
    processing_status text DEFAULT 'PENDING'::text NOT NULL,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_backup (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    backup_type text NOT NULL,
    scope text NOT NULL,
    status text DEFAULT 'SCHEDULED'::text NOT NULL,
    file_url text,
    file_size_bytes bigint,
    file_hash text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT system_backup_time_ck CHECK (((completed_at IS NULL) OR (started_at IS NULL) OR (completed_at >= started_at)))
);


--
-- Name: system_setting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_setting (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    setting_type text DEFAULT 'json'::text NOT NULL,
    last_modified_by_user_id text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: track_segment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.track_segment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_track_id uuid NOT NULL,
    from_sighting_id uuid,
    to_sighting_id uuid,
    distance_meters numeric(18,6),
    duration_seconds integer,
    speed_mps numeric(18,6),
    is_interpolated boolean DEFAULT false NOT NULL,
    confidence numeric(10,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT track_segment_confidence_ck CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))),
    CONSTRAINT track_segment_duration_ck CHECK (((duration_seconds IS NULL) OR (duration_seconds > 0)))
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_role (
    user_id text NOT NULL,
    role_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: watchlist_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watchlist_entry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_profile_id uuid NOT NULL,
    priority_level text NOT NULL,
    reason text NOT NULL,
    case_id uuid,
    expiry_date timestamp with time zone,
    created_by_user_id text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_id uuid NOT NULL,
    url text NOT NULL,
    events_subscribed jsonb DEFAULT '[]'::jsonb NOT NULL,
    secret_key_hash text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: ai_model ai_model_model_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_model
    ADD CONSTRAINT ai_model_model_key_key UNIQUE (model_key);


--
-- Name: ai_model ai_model_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_model
    ADD CONSTRAINT ai_model_pkey PRIMARY KEY (id);


--
-- Name: alert_acknowledgment alert_acknowledgment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_acknowledgment
    ADD CONSTRAINT alert_acknowledgment_pkey PRIMARY KEY (id);


--
-- Name: alert alert_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_pkey PRIMARY KEY (id);


--
-- Name: alert_routing_rule alert_routing_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_routing_rule
    ADD CONSTRAINT alert_routing_rule_pkey PRIMARY KEY (id);


--
-- Name: anonymous_tip anonymous_tip_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anonymous_tip
    ADD CONSTRAINT anonymous_tip_pkey PRIMARY KEY (id);


--
-- Name: anonymous_tip anonymous_tip_reference_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anonymous_tip
    ADD CONSTRAINT anonymous_tip_reference_code_key UNIQUE (reference_code);


--
-- Name: api_key api_key_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_entry_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_entry_hash_key UNIQUE (entry_hash);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: camera camera_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.camera
    ADD CONSTRAINT camera_pkey PRIMARY KEY (id);


--
-- Name: case case_case_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."case"
    ADD CONSTRAINT case_case_number_key UNIQUE (case_number);


--
-- Name: case_evidence case_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_evidence
    ADD CONSTRAINT case_evidence_pkey PRIMARY KEY (id);


--
-- Name: case_incident case_incident_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_incident
    ADD CONSTRAINT case_incident_pkey PRIMARY KEY (case_id, incident_id);


--
-- Name: case case_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."case"
    ADD CONSTRAINT case_pkey PRIMARY KEY (id);


--
-- Name: case_report case_report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_report
    ADD CONSTRAINT case_report_pkey PRIMARY KEY (id);


--
-- Name: case_share_record case_share_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_share_record
    ADD CONSTRAINT case_share_record_pkey PRIMARY KEY (id);


--
-- Name: chain_of_custody chain_of_custody_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chain_of_custody
    ADD CONSTRAINT chain_of_custody_pkey PRIMARY KEY (id);


--
-- Name: community_feed_item community_feed_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_feed_item
    ADD CONSTRAINT community_feed_item_pkey PRIMARY KEY (id);


--
-- Name: community_interaction community_interaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_interaction
    ADD CONSTRAINT community_interaction_pkey PRIMARY KEY (id);


--
-- Name: community_preference community_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_preference
    ADD CONSTRAINT community_preference_pkey PRIMARY KEY (id);


--
-- Name: community_preference community_preference_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_preference
    ADD CONSTRAINT community_preference_user_id_key UNIQUE (user_id);


--
-- Name: community_sighting community_sighting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_sighting
    ADD CONSTRAINT community_sighting_pkey PRIMARY KEY (id);


--
-- Name: community_sighting community_sighting_reference_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_sighting
    ADD CONSTRAINT community_sighting_reference_code_key UNIQUE (reference_code);


--
-- Name: compliance_check compliance_check_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_check
    ADD CONSTRAINT compliance_check_pkey PRIMARY KEY (id);


--
-- Name: compliance_report compliance_report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_report
    ADD CONSTRAINT compliance_report_pkey PRIMARY KEY (id);


--
-- Name: data_classification data_classification_level_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_classification
    ADD CONSTRAINT data_classification_level_key UNIQUE (level);


--
-- Name: data_classification data_classification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_classification
    ADD CONSTRAINT data_classification_pkey PRIMARY KEY (id);


--
-- Name: data_classification data_classification_rank_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_classification
    ADD CONSTRAINT data_classification_rank_key UNIQUE (rank);


--
-- Name: deployment_record deployment_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_record
    ADD CONSTRAINT deployment_record_pkey PRIMARY KEY (id);


--
-- Name: detection_configuration detection_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection_configuration
    ADD CONSTRAINT detection_configuration_pkey PRIMARY KEY (id);


--
-- Name: detection detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection
    ADD CONSTRAINT detection_pkey PRIMARY KEY (id);


--
-- Name: disaster_recovery_event disaster_recovery_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_recovery_event
    ADD CONSTRAINT disaster_recovery_event_pkey PRIMARY KEY (id);


--
-- Name: dispatch_request dispatch_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_request
    ADD CONSTRAINT dispatch_request_pkey PRIMARY KEY (id);


--
-- Name: edge_configuration edge_configuration_edge_node_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_configuration
    ADD CONSTRAINT edge_configuration_edge_node_id_key UNIQUE (edge_node_id);


--
-- Name: edge_configuration edge_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_configuration
    ADD CONSTRAINT edge_configuration_pkey PRIMARY KEY (id);


--
-- Name: edge_health_metric edge_health_metric_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_health_metric
    ADD CONSTRAINT edge_health_metric_pkey PRIMARY KEY (id);


--
-- Name: edge_model_deployment edge_model_deployment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_model_deployment
    ADD CONSTRAINT edge_model_deployment_pkey PRIMARY KEY (id);


--
-- Name: edge_node_config edge_node_config_edge_node_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_node_config
    ADD CONSTRAINT edge_node_config_edge_node_id_key UNIQUE (edge_node_id);


--
-- Name: edge_node_config edge_node_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_node_config
    ADD CONSTRAINT edge_node_config_pkey PRIMARY KEY (id);


--
-- Name: edge_node edge_node_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_node
    ADD CONSTRAINT edge_node_pkey PRIMARY KEY (id);


--
-- Name: edge_sync_record edge_sync_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_sync_record
    ADD CONSTRAINT edge_sync_record_pkey PRIMARY KEY (id);


--
-- Name: emergency_operation_log emergency_operation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_operation_log
    ADD CONSTRAINT emergency_operation_log_pkey PRIMARY KEY (id);


--
-- Name: entity_match entity_match_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_match
    ADD CONSTRAINT entity_match_pkey PRIMARY KEY (id);


--
-- Name: entity_profile entity_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_profile
    ADD CONSTRAINT entity_profile_pkey PRIMARY KEY (id);


--
-- Name: entity_track entity_track_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_track
    ADD CONSTRAINT entity_track_pkey PRIMARY KEY (id);


--
-- Name: evidence_integrity_check evidence_integrity_check_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_integrity_check
    ADD CONSTRAINT evidence_integrity_check_pkey PRIMARY KEY (id);


--
-- Name: evidence_marker evidence_marker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_marker
    ADD CONSTRAINT evidence_marker_pkey PRIMARY KEY (id);


--
-- Name: evidence_request evidence_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_request
    ADD CONSTRAINT evidence_request_pkey PRIMARY KEY (id);


--
-- Name: external_integration external_integration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_integration
    ADD CONSTRAINT external_integration_name_key UNIQUE (name);


--
-- Name: external_integration external_integration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_integration
    ADD CONSTRAINT external_integration_pkey PRIMARY KEY (id);


--
-- Name: face_detection face_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.face_detection
    ADD CONSTRAINT face_detection_pkey PRIMARY KEY (id);


--
-- Name: feature_flag feature_flag_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flag
    ADD CONSTRAINT feature_flag_name_key UNIQUE (name);


--
-- Name: feature_flag feature_flag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flag
    ADD CONSTRAINT feature_flag_pkey PRIMARY KEY (id);


--
-- Name: geofence geofence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geofence
    ADD CONSTRAINT geofence_pkey PRIMARY KEY (id);


--
-- Name: geofence_violation geofence_violation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geofence_violation
    ADD CONSTRAINT geofence_violation_pkey PRIMARY KEY (id);


--
-- Name: incident incident_incident_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident
    ADD CONSTRAINT incident_incident_number_key UNIQUE (incident_number);


--
-- Name: incident incident_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident
    ADD CONSTRAINT incident_pkey PRIMARY KEY (id);


--
-- Name: infrastructure_environment infrastructure_environment_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infrastructure_environment
    ADD CONSTRAINT infrastructure_environment_name_key UNIQUE (name);


--
-- Name: infrastructure_environment infrastructure_environment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infrastructure_environment
    ADD CONSTRAINT infrastructure_environment_pkey PRIMARY KEY (id);


--
-- Name: infrastructure_event infrastructure_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infrastructure_event
    ADD CONSTRAINT infrastructure_event_pkey PRIMARY KEY (id);


--
-- Name: integration_export_log integration_export_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_export_log
    ADD CONSTRAINT integration_export_log_pkey PRIMARY KEY (id);


--
-- Name: integration_health integration_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_health
    ADD CONSTRAINT integration_health_pkey PRIMARY KEY (id);


--
-- Name: integration_import_log integration_import_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_import_log
    ADD CONSTRAINT integration_import_log_pkey PRIMARY KEY (id);


--
-- Name: investigation_case investigation_case_case_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_case
    ADD CONSTRAINT investigation_case_case_number_key UNIQUE (case_number);


--
-- Name: investigation_case investigation_case_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_case
    ADD CONSTRAINT investigation_case_pkey PRIMARY KEY (id);


--
-- Name: investigation_note investigation_note_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_note
    ADD CONSTRAINT investigation_note_pkey PRIMARY KEY (id);


--
-- Name: law_enforcement_officer law_enforcement_officer_badge_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.law_enforcement_officer
    ADD CONSTRAINT law_enforcement_officer_badge_number_key UNIQUE (badge_number);


--
-- Name: law_enforcement_officer law_enforcement_officer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.law_enforcement_officer
    ADD CONSTRAINT law_enforcement_officer_pkey PRIMARY KEY (id);


--
-- Name: law_enforcement_officer law_enforcement_officer_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.law_enforcement_officer
    ADD CONSTRAINT law_enforcement_officer_user_id_key UNIQUE (user_id);


--
-- Name: media_annotation media_annotation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_annotation
    ADD CONSTRAINT media_annotation_pkey PRIMARY KEY (id);


--
-- Name: media_asset media_asset_file_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_asset
    ADD CONSTRAINT media_asset_file_hash_key UNIQUE (file_hash);


--
-- Name: media_asset media_asset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_asset
    ADD CONSTRAINT media_asset_pkey PRIMARY KEY (id);


--
-- Name: media_metadata media_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_metadata
    ADD CONSTRAINT media_metadata_pkey PRIMARY KEY (id);


--
-- Name: media_retention_record media_retention_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_retention_record
    ADD CONSTRAINT media_retention_record_pkey PRIMARY KEY (id);


--
-- Name: media_transcoded_variant media_transcoded_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_transcoded_variant
    ADD CONSTRAINT media_transcoded_variant_pkey PRIMARY KEY (id);


--
-- Name: moderation_review moderation_review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_review
    ADD CONSTRAINT moderation_review_pkey PRIMARY KEY (id);


--
-- Name: monitoring_session monitoring_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_session
    ADD CONSTRAINT monitoring_session_pkey PRIMARY KEY (id);


--
-- Name: monitoring_zone monitoring_zone_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_zone
    ADD CONSTRAINT monitoring_zone_pkey PRIMARY KEY (id);


--
-- Name: movement_pattern_analysis movement_pattern_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_pattern_analysis
    ADD CONSTRAINT movement_pattern_analysis_pkey PRIMARY KEY (id);


--
-- Name: movement_pattern movement_pattern_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_pattern
    ADD CONSTRAINT movement_pattern_pkey PRIMARY KEY (id);


--
-- Name: movement_prediction movement_prediction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_prediction
    ADD CONSTRAINT movement_prediction_pkey PRIMARY KEY (id);


--
-- Name: movement_timeline movement_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_timeline
    ADD CONSTRAINT movement_timeline_pkey PRIMARY KEY (id);


--
-- Name: network_security_rule network_security_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.network_security_rule
    ADD CONSTRAINT network_security_rule_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: notification_preference notification_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preference
    ADD CONSTRAINT notification_preference_pkey PRIMARY KEY (id);


--
-- Name: notification_preference notification_preference_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preference
    ADD CONSTRAINT notification_preference_user_id_key UNIQUE (user_id);


--
-- Name: officer_verification officer_verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.officer_verification
    ADD CONSTRAINT officer_verification_pkey PRIMARY KEY (id);


--
-- Name: operational_report operational_report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_report
    ADD CONSTRAINT operational_report_pkey PRIMARY KEY (id);


--
-- Name: operator_shift operator_shift_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operator_shift
    ADD CONSTRAINT operator_shift_pkey PRIMARY KEY (id);


--
-- Name: permission permission_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission
    ADD CONSTRAINT permission_code_key UNIQUE (code);


--
-- Name: permission permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission
    ADD CONSTRAINT permission_pkey PRIMARY KEY (id);


--
-- Name: person_attributes person_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_attributes
    ADD CONSTRAINT person_attributes_pkey PRIMARY KEY (id);


--
-- Name: plate_detection plate_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plate_detection
    ADD CONSTRAINT plate_detection_pkey PRIMARY KEY (id);


--
-- Name: reconstruction_asset reconstruction_asset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconstruction_asset
    ADD CONSTRAINT reconstruction_asset_pkey PRIMARY KEY (id);


--
-- Name: reconstruction_project reconstruction_project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconstruction_project
    ADD CONSTRAINT reconstruction_project_pkey PRIMARY KEY (id);


--
-- Name: retention_policy retention_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retention_policy
    ADD CONSTRAINT retention_policy_pkey PRIMARY KEY (id);


--
-- Name: retention_policy retention_policy_policy_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retention_policy
    ADD CONSTRAINT retention_policy_policy_name_key UNIQUE (policy_name);


--
-- Name: role role_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_code_key UNIQUE (code);


--
-- Name: role_permission role_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission
    ADD CONSTRAINT role_permission_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: scaling_event scaling_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scaling_event
    ADD CONSTRAINT scaling_event_pkey PRIMARY KEY (id);


--
-- Name: scene_annotation scene_annotation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_annotation
    ADD CONSTRAINT scene_annotation_pkey PRIMARY KEY (id);


--
-- Name: scene_measurement scene_measurement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_measurement
    ADD CONSTRAINT scene_measurement_pkey PRIMARY KEY (id);


--
-- Name: security_policy security_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_policy
    ADD CONSTRAINT security_policy_pkey PRIMARY KEY (id);


--
-- Name: security_policy security_policy_policy_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_policy
    ADD CONSTRAINT security_policy_policy_name_key UNIQUE (policy_name);


--
-- Name: service_instance service_instance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_instance
    ADD CONSTRAINT service_instance_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: sighting_comment sighting_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sighting_comment
    ADD CONSTRAINT sighting_comment_pkey PRIMARY KEY (id);


--
-- Name: sighting sighting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sighting
    ADD CONSTRAINT sighting_pkey PRIMARY KEY (id);


--
-- Name: source_file source_file_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_file
    ADD CONSTRAINT source_file_pkey PRIMARY KEY (id);


--
-- Name: system_backup system_backup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_backup
    ADD CONSTRAINT system_backup_pkey PRIMARY KEY (id);


--
-- Name: system_setting system_setting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_setting
    ADD CONSTRAINT system_setting_pkey PRIMARY KEY (id);


--
-- Name: system_setting system_setting_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_setting
    ADD CONSTRAINT system_setting_setting_key_key UNIQUE (setting_key);


--
-- Name: track_segment track_segment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.track_segment
    ADD CONSTRAINT track_segment_pkey PRIMARY KEY (id);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user_role user_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: watchlist_entry watchlist_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_entry
    ADD CONSTRAINT watchlist_entry_pkey PRIMARY KEY (id);


--
-- Name: webhook_config webhook_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_config
    ADD CONSTRAINT webhook_config_pkey PRIMARY KEY (id);


--
-- Name: account_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_user_id_idx ON public.account USING btree (user_id);


--
-- Name: alert_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX alert_severity_idx ON public.alert USING btree (severity);


--
-- Name: alert_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX alert_status_idx ON public.alert USING btree (status);


--
-- Name: audit_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_created_at_idx ON public.audit_log USING btree (created_at);


--
-- Name: audit_log_domain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_domain_idx ON public.audit_log USING btree (domain);


--
-- Name: audit_log_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_event_type_idx ON public.audit_log USING btree (event_type);


--
-- Name: detection_camera_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX detection_camera_idx ON public.detection USING btree (camera_id);


--
-- Name: detection_media_asset_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX detection_media_asset_idx ON public.detection USING btree (media_asset_id);


--
-- Name: detection_review_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX detection_review_status_idx ON public.detection USING btree (review_status);


--
-- Name: idx_case_evidence_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_evidence_case_id ON public.case_evidence USING btree (case_id);


--
-- Name: idx_case_evidence_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_evidence_entity ON public.case_evidence USING btree (evidence_entity_type, evidence_entity_id);


--
-- Name: idx_investigation_note_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investigation_note_case_id ON public.investigation_note USING btree (case_id);


--
-- Name: incident_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX incident_severity_idx ON public.incident USING btree (severity);


--
-- Name: incident_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX incident_status_idx ON public.incident USING btree (status);


--
-- Name: media_asset_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_asset_created_at_idx ON public.media_asset USING btree (created_at);


--
-- Name: media_asset_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_asset_source_idx ON public.media_asset USING btree (source);


--
-- Name: media_asset_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_asset_type_idx ON public.media_asset USING btree (type);


--
-- Name: monitoring_session_operator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX monitoring_session_operator_idx ON public.monitoring_session USING btree (operator_user_id);


--
-- Name: operator_shift_operator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operator_shift_operator_idx ON public.operator_shift USING btree (operator_user_id);


--
-- Name: service_instance_environment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_instance_environment_idx ON public.service_instance USING btree (environment_id);


--
-- Name: session_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX session_user_id_idx ON public.session USING btree (user_id);


--
-- Name: sighting_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sighting_entity_idx ON public.sighting USING btree (entity_profile_id);


--
-- Name: sighting_track_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sighting_track_idx ON public.sighting USING btree (entity_track_id);


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: account account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: alert_acknowledgment alert_acknowledgment_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_acknowledgment
    ADD CONSTRAINT alert_acknowledgment_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alert(id) ON DELETE CASCADE;


--
-- Name: alert_acknowledgment alert_acknowledgment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_acknowledgment
    ADD CONSTRAINT alert_acknowledgment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: alert_routing_rule alert_routing_rule_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_routing_rule
    ADD CONSTRAINT alert_routing_rule_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: anonymous_tip anonymous_tip_linked_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anonymous_tip
    ADD CONSTRAINT anonymous_tip_linked_case_id_fkey FOREIGN KEY (linked_case_id) REFERENCES public."case"(id) ON DELETE SET NULL;


--
-- Name: api_key api_key_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: api_key api_key_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.external_integration(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: case case_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."case"
    ADD CONSTRAINT case_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: case case_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."case"
    ADD CONSTRAINT case_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: case_evidence case_evidence_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_evidence
    ADD CONSTRAINT case_evidence_case_id_fkey FOREIGN KEY (case_id) REFERENCES public."case"(id) ON DELETE CASCADE;


--
-- Name: case_evidence case_evidence_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_evidence
    ADD CONSTRAINT case_evidence_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: case_incident case_incident_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_incident
    ADD CONSTRAINT case_incident_case_id_fkey FOREIGN KEY (case_id) REFERENCES public."case"(id) ON DELETE CASCADE;


--
-- Name: case_incident case_incident_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_incident
    ADD CONSTRAINT case_incident_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incident(id) ON DELETE CASCADE;


--
-- Name: case_report case_report_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_report
    ADD CONSTRAINT case_report_case_id_fkey FOREIGN KEY (case_id) REFERENCES public."case"(id) ON DELETE CASCADE;


--
-- Name: case_report case_report_generated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_report
    ADD CONSTRAINT case_report_generated_by_user_id_fkey FOREIGN KEY (generated_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: case_share_record case_share_record_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_share_record
    ADD CONSTRAINT case_share_record_case_id_fkey FOREIGN KEY (case_id) REFERENCES public."case"(id) ON DELETE CASCADE;


--
-- Name: case_share_record case_share_record_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_share_record
    ADD CONSTRAINT case_share_record_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.external_integration(id) ON DELETE SET NULL;


--
-- Name: case_share_record case_share_record_shared_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_share_record
    ADD CONSTRAINT case_share_record_shared_by_user_id_fkey FOREIGN KEY (shared_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: chain_of_custody chain_of_custody_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chain_of_custody
    ADD CONSTRAINT chain_of_custody_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: chain_of_custody chain_of_custody_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chain_of_custody
    ADD CONSTRAINT chain_of_custody_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: community_interaction community_interaction_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_interaction
    ADD CONSTRAINT community_interaction_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: community_preference community_preference_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_preference
    ADD CONSTRAINT community_preference_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: community_sighting community_sighting_linked_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_sighting
    ADD CONSTRAINT community_sighting_linked_incident_id_fkey FOREIGN KEY (linked_incident_id) REFERENCES public.incident(id) ON DELETE SET NULL;


--
-- Name: community_sighting community_sighting_reporter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_sighting
    ADD CONSTRAINT community_sighting_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: compliance_check compliance_check_checked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_check
    ADD CONSTRAINT compliance_check_checked_by_user_id_fkey FOREIGN KEY (checked_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: compliance_report compliance_report_generated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_report
    ADD CONSTRAINT compliance_report_generated_by_user_id_fkey FOREIGN KEY (generated_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: deployment_record deployment_record_deployed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_record
    ADD CONSTRAINT deployment_record_deployed_by_user_id_fkey FOREIGN KEY (deployed_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: detection detection_camera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection
    ADD CONSTRAINT detection_camera_id_fkey FOREIGN KEY (camera_id) REFERENCES public.camera(id) ON DELETE SET NULL;


--
-- Name: detection_configuration detection_configuration_camera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection_configuration
    ADD CONSTRAINT detection_configuration_camera_id_fkey FOREIGN KEY (camera_id) REFERENCES public.camera(id) ON DELETE SET NULL;


--
-- Name: detection_configuration detection_configuration_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection_configuration
    ADD CONSTRAINT detection_configuration_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: detection_configuration detection_configuration_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection_configuration
    ADD CONSTRAINT detection_configuration_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: detection_configuration detection_configuration_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection_configuration
    ADD CONSTRAINT detection_configuration_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.monitoring_zone(id) ON DELETE SET NULL;


--
-- Name: detection detection_detection_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection
    ADD CONSTRAINT detection_detection_configuration_id_fkey FOREIGN KEY (detection_configuration_id) REFERENCES public.detection_configuration(id) ON DELETE SET NULL;


--
-- Name: detection detection_escalated_to_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection
    ADD CONSTRAINT detection_escalated_to_incident_id_fkey FOREIGN KEY (escalated_to_incident_id) REFERENCES public.incident(id) ON DELETE SET NULL;


--
-- Name: detection detection_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection
    ADD CONSTRAINT detection_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_asset(id) ON DELETE CASCADE;


--
-- Name: detection detection_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection
    ADD CONSTRAINT detection_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.ai_model(id) ON DELETE SET NULL;


--
-- Name: detection detection_reviewed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection
    ADD CONSTRAINT detection_reviewed_by_user_id_fkey FOREIGN KEY (reviewed_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: detection detection_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detection
    ADD CONSTRAINT detection_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.monitoring_zone(id) ON DELETE SET NULL;


--
-- Name: disaster_recovery_event disaster_recovery_event_initiated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_recovery_event
    ADD CONSTRAINT disaster_recovery_event_initiated_by_user_id_fkey FOREIGN KEY (initiated_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: disaster_recovery_event disaster_recovery_event_source_environment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_recovery_event
    ADD CONSTRAINT disaster_recovery_event_source_environment_id_fkey FOREIGN KEY (source_environment_id) REFERENCES public.infrastructure_environment(id) ON DELETE SET NULL;


--
-- Name: disaster_recovery_event disaster_recovery_event_target_environment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_recovery_event
    ADD CONSTRAINT disaster_recovery_event_target_environment_id_fkey FOREIGN KEY (target_environment_id) REFERENCES public.infrastructure_environment(id) ON DELETE SET NULL;


--
-- Name: dispatch_request dispatch_request_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_request
    ADD CONSTRAINT dispatch_request_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: dispatch_request dispatch_request_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_request
    ADD CONSTRAINT dispatch_request_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incident(id) ON DELETE SET NULL;


--
-- Name: edge_configuration edge_configuration_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_configuration
    ADD CONSTRAINT edge_configuration_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: edge_configuration edge_configuration_edge_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_configuration
    ADD CONSTRAINT edge_configuration_edge_node_id_fkey FOREIGN KEY (edge_node_id) REFERENCES public.edge_node(id) ON DELETE CASCADE;


--
-- Name: edge_health_metric edge_health_metric_edge_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_health_metric
    ADD CONSTRAINT edge_health_metric_edge_node_id_fkey FOREIGN KEY (edge_node_id) REFERENCES public.edge_node(id) ON DELETE CASCADE;


--
-- Name: edge_model_deployment edge_model_deployment_edge_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_model_deployment
    ADD CONSTRAINT edge_model_deployment_edge_node_id_fkey FOREIGN KEY (edge_node_id) REFERENCES public.edge_node(id) ON DELETE CASCADE;


--
-- Name: edge_node_config edge_node_config_edge_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_node_config
    ADD CONSTRAINT edge_node_config_edge_node_id_fkey FOREIGN KEY (edge_node_id) REFERENCES public.edge_node(id) ON DELETE CASCADE;


--
-- Name: edge_sync_record edge_sync_record_edge_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_sync_record
    ADD CONSTRAINT edge_sync_record_edge_node_id_fkey FOREIGN KEY (edge_node_id) REFERENCES public.edge_node(id) ON DELETE CASCADE;


--
-- Name: emergency_operation_log emergency_operation_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_operation_log
    ADD CONSTRAINT emergency_operation_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: entity_match entity_match_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_match
    ADD CONSTRAINT entity_match_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE SET NULL;


--
-- Name: entity_track entity_track_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_track
    ADD CONSTRAINT entity_track_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE CASCADE;


--
-- Name: evidence_marker evidence_marker_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_marker
    ADD CONSTRAINT evidence_marker_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: evidence_marker evidence_marker_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_marker
    ADD CONSTRAINT evidence_marker_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.reconstruction_project(id) ON DELETE CASCADE;


--
-- Name: evidence_request evidence_request_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_request
    ADD CONSTRAINT evidence_request_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: evidence_request evidence_request_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_request
    ADD CONSTRAINT evidence_request_case_id_fkey FOREIGN KEY (case_id) REFERENCES public."case"(id) ON DELETE CASCADE;


--
-- Name: evidence_request evidence_request_requesting_officer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_request
    ADD CONSTRAINT evidence_request_requesting_officer_id_fkey FOREIGN KEY (requesting_officer_id) REFERENCES public.law_enforcement_officer(id) ON DELETE CASCADE;


--
-- Name: face_detection face_detection_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.face_detection
    ADD CONSTRAINT face_detection_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE SET NULL;


--
-- Name: face_detection face_detection_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.face_detection
    ADD CONSTRAINT face_detection_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_asset(id) ON DELETE CASCADE;


--
-- Name: feature_flag feature_flag_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flag
    ADD CONSTRAINT feature_flag_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: geofence geofence_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geofence
    ADD CONSTRAINT geofence_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: geofence_violation geofence_violation_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geofence_violation
    ADD CONSTRAINT geofence_violation_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE SET NULL;


--
-- Name: geofence_violation geofence_violation_geofence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geofence_violation
    ADD CONSTRAINT geofence_violation_geofence_id_fkey FOREIGN KEY (geofence_id) REFERENCES public.geofence(id) ON DELETE CASCADE;


--
-- Name: incident incident_reported_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident
    ADD CONSTRAINT incident_reported_by_user_id_fkey FOREIGN KEY (reported_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: integration_export_log integration_export_log_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_export_log
    ADD CONSTRAINT integration_export_log_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.external_integration(id) ON DELETE CASCADE;


--
-- Name: integration_health integration_health_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_health
    ADD CONSTRAINT integration_health_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.external_integration(id) ON DELETE CASCADE;


--
-- Name: integration_import_log integration_import_log_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_import_log
    ADD CONSTRAINT integration_import_log_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.external_integration(id) ON DELETE CASCADE;


--
-- Name: investigation_case investigation_case_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_case
    ADD CONSTRAINT investigation_case_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public."user"(id);


--
-- Name: investigation_case investigation_case_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_case
    ADD CONSTRAINT investigation_case_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id);


--
-- Name: investigation_note investigation_note_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_note
    ADD CONSTRAINT investigation_note_case_id_fkey FOREIGN KEY (case_id) REFERENCES public."case"(id) ON DELETE CASCADE;


--
-- Name: investigation_note investigation_note_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_note
    ADD CONSTRAINT investigation_note_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: law_enforcement_officer law_enforcement_officer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.law_enforcement_officer
    ADD CONSTRAINT law_enforcement_officer_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: media_annotation media_annotation_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_annotation
    ADD CONSTRAINT media_annotation_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: media_annotation media_annotation_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_annotation
    ADD CONSTRAINT media_annotation_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_asset(id) ON DELETE CASCADE;


--
-- Name: media_asset media_asset_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_asset
    ADD CONSTRAINT media_asset_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: media_metadata media_metadata_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_metadata
    ADD CONSTRAINT media_metadata_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_asset(id) ON DELETE CASCADE;


--
-- Name: media_retention_record media_retention_record_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_retention_record
    ADD CONSTRAINT media_retention_record_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_asset(id) ON DELETE CASCADE;


--
-- Name: media_retention_record media_retention_record_retention_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_retention_record
    ADD CONSTRAINT media_retention_record_retention_policy_id_fkey FOREIGN KEY (retention_policy_id) REFERENCES public.retention_policy(id) ON DELETE SET NULL;


--
-- Name: media_transcoded_variant media_transcoded_variant_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_transcoded_variant
    ADD CONSTRAINT media_transcoded_variant_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_asset(id) ON DELETE CASCADE;


--
-- Name: moderation_review moderation_review_reviewed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_review
    ADD CONSTRAINT moderation_review_reviewed_by_user_id_fkey FOREIGN KEY (reviewed_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: monitoring_session monitoring_session_operator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_session
    ADD CONSTRAINT monitoring_session_operator_user_id_fkey FOREIGN KEY (operator_user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: monitoring_zone monitoring_zone_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_zone
    ADD CONSTRAINT monitoring_zone_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: movement_pattern_analysis movement_pattern_analysis_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_pattern_analysis
    ADD CONSTRAINT movement_pattern_analysis_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE CASCADE;


--
-- Name: movement_pattern movement_pattern_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_pattern
    ADD CONSTRAINT movement_pattern_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE SET NULL;


--
-- Name: movement_pattern movement_pattern_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_pattern
    ADD CONSTRAINT movement_pattern_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.monitoring_zone(id) ON DELETE SET NULL;


--
-- Name: movement_prediction movement_prediction_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_prediction
    ADD CONSTRAINT movement_prediction_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE CASCADE;


--
-- Name: movement_timeline movement_timeline_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_timeline
    ADD CONSTRAINT movement_timeline_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE CASCADE;


--
-- Name: network_security_rule network_security_rule_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.network_security_rule
    ADD CONSTRAINT network_security_rule_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: network_security_rule network_security_rule_environment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.network_security_rule
    ADD CONSTRAINT network_security_rule_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.infrastructure_environment(id) ON DELETE SET NULL;


--
-- Name: notification notification_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alert(id) ON DELETE CASCADE;


--
-- Name: notification_preference notification_preference_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preference
    ADD CONSTRAINT notification_preference_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: notification notification_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: officer_verification officer_verification_officer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.officer_verification
    ADD CONSTRAINT officer_verification_officer_user_id_fkey FOREIGN KEY (officer_user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: officer_verification officer_verification_verifier_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.officer_verification
    ADD CONSTRAINT officer_verification_verifier_user_id_fkey FOREIGN KEY (verifier_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: operational_report operational_report_generated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_report
    ADD CONSTRAINT operational_report_generated_by_user_id_fkey FOREIGN KEY (generated_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: operator_shift operator_shift_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operator_shift
    ADD CONSTRAINT operator_shift_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: operator_shift operator_shift_operator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operator_shift
    ADD CONSTRAINT operator_shift_operator_user_id_fkey FOREIGN KEY (operator_user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: person_attributes person_attributes_face_detection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_attributes
    ADD CONSTRAINT person_attributes_face_detection_id_fkey FOREIGN KEY (face_detection_id) REFERENCES public.face_detection(id) ON DELETE CASCADE;


--
-- Name: plate_detection plate_detection_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plate_detection
    ADD CONSTRAINT plate_detection_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE SET NULL;


--
-- Name: plate_detection plate_detection_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plate_detection
    ADD CONSTRAINT plate_detection_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_asset(id) ON DELETE CASCADE;


--
-- Name: reconstruction_asset reconstruction_asset_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconstruction_asset
    ADD CONSTRAINT reconstruction_asset_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.reconstruction_project(id) ON DELETE CASCADE;


--
-- Name: reconstruction_project reconstruction_project_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconstruction_project
    ADD CONSTRAINT reconstruction_project_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: reconstruction_project reconstruction_project_linked_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconstruction_project
    ADD CONSTRAINT reconstruction_project_linked_case_id_fkey FOREIGN KEY (linked_case_id) REFERENCES public."case"(id) ON DELETE SET NULL;


--
-- Name: reconstruction_project reconstruction_project_linked_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconstruction_project
    ADD CONSTRAINT reconstruction_project_linked_incident_id_fkey FOREIGN KEY (linked_incident_id) REFERENCES public.incident(id) ON DELETE SET NULL;


--
-- Name: role_permission role_permission_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission
    ADD CONSTRAINT role_permission_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permission(id) ON DELETE CASCADE;


--
-- Name: role_permission role_permission_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission
    ADD CONSTRAINT role_permission_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(id) ON DELETE CASCADE;


--
-- Name: scaling_event scaling_event_environment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scaling_event
    ADD CONSTRAINT scaling_event_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.infrastructure_environment(id) ON DELETE SET NULL;


--
-- Name: scaling_event scaling_event_service_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scaling_event
    ADD CONSTRAINT scaling_event_service_instance_id_fkey FOREIGN KEY (service_instance_id) REFERENCES public.service_instance(id) ON DELETE SET NULL;


--
-- Name: scene_annotation scene_annotation_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_annotation
    ADD CONSTRAINT scene_annotation_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: scene_annotation scene_annotation_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_annotation
    ADD CONSTRAINT scene_annotation_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.reconstruction_project(id) ON DELETE CASCADE;


--
-- Name: scene_measurement scene_measurement_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_measurement
    ADD CONSTRAINT scene_measurement_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.reconstruction_project(id) ON DELETE CASCADE;


--
-- Name: security_policy security_policy_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_policy
    ADD CONSTRAINT security_policy_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: service_instance service_instance_environment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_instance
    ADD CONSTRAINT service_instance_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.infrastructure_environment(id) ON DELETE CASCADE;


--
-- Name: session session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: sighting sighting_camera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sighting
    ADD CONSTRAINT sighting_camera_id_fkey FOREIGN KEY (camera_id) REFERENCES public.camera(id) ON DELETE SET NULL;


--
-- Name: sighting_comment sighting_comment_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sighting_comment
    ADD CONSTRAINT sighting_comment_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: sighting_comment sighting_comment_sighting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sighting_comment
    ADD CONSTRAINT sighting_comment_sighting_id_fkey FOREIGN KEY (sighting_id) REFERENCES public.community_sighting(id) ON DELETE CASCADE;


--
-- Name: sighting sighting_detection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sighting
    ADD CONSTRAINT sighting_detection_id_fkey FOREIGN KEY (detection_id) REFERENCES public.detection(id) ON DELETE SET NULL;


--
-- Name: sighting sighting_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sighting
    ADD CONSTRAINT sighting_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE CASCADE;


--
-- Name: sighting sighting_entity_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sighting
    ADD CONSTRAINT sighting_entity_track_id_fkey FOREIGN KEY (entity_track_id) REFERENCES public.entity_track(id) ON DELETE CASCADE;


--
-- Name: sighting sighting_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sighting
    ADD CONSTRAINT sighting_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.monitoring_zone(id) ON DELETE SET NULL;


--
-- Name: source_file source_file_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_file
    ADD CONSTRAINT source_file_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.reconstruction_project(id) ON DELETE CASCADE;


--
-- Name: system_backup system_backup_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_backup
    ADD CONSTRAINT system_backup_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: system_setting system_setting_last_modified_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_setting
    ADD CONSTRAINT system_setting_last_modified_by_user_id_fkey FOREIGN KEY (last_modified_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: track_segment track_segment_entity_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.track_segment
    ADD CONSTRAINT track_segment_entity_track_id_fkey FOREIGN KEY (entity_track_id) REFERENCES public.entity_track(id) ON DELETE CASCADE;


--
-- Name: track_segment track_segment_from_sighting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.track_segment
    ADD CONSTRAINT track_segment_from_sighting_id_fkey FOREIGN KEY (from_sighting_id) REFERENCES public.sighting(id) ON DELETE SET NULL;


--
-- Name: track_segment track_segment_to_sighting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.track_segment
    ADD CONSTRAINT track_segment_to_sighting_id_fkey FOREIGN KEY (to_sighting_id) REFERENCES public.sighting(id) ON DELETE SET NULL;


--
-- Name: user_role user_role_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(id) ON DELETE CASCADE;


--
-- Name: user_role user_role_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: watchlist_entry watchlist_entry_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_entry
    ADD CONSTRAINT watchlist_entry_case_id_fkey FOREIGN KEY (case_id) REFERENCES public."case"(id) ON DELETE SET NULL;


--
-- Name: watchlist_entry watchlist_entry_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_entry
    ADD CONSTRAINT watchlist_entry_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: watchlist_entry watchlist_entry_entity_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_entry
    ADD CONSTRAINT watchlist_entry_entity_profile_id_fkey FOREIGN KEY (entity_profile_id) REFERENCES public.entity_profile(id) ON DELETE CASCADE;


--
-- Name: webhook_config webhook_config_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_config
    ADD CONSTRAINT webhook_config_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.external_integration(id) ON DELETE CASCADE;


--
-- Name: case_evidence Allow all access to authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to authenticated users" ON public.case_evidence USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: detection Allow all access to authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to authenticated users" ON public.detection USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: entity_profile Allow all access to authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to authenticated users" ON public.entity_profile USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: investigation_case Allow all access to authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to authenticated users" ON public.investigation_case USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: investigation_note Allow all access to authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to authenticated users" ON public.investigation_note USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: media_asset Allow all access to authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to authenticated users" ON public.media_asset USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: user Allow all access to authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to authenticated users" ON public."user" USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: case_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.case_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: detection; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.detection ENABLE ROW LEVEL SECURITY;

--
-- Name: entity_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.entity_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: investigation_case; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investigation_case ENABLE ROW LEVEL SECURITY;

--
-- Name: investigation_note; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investigation_note ENABLE ROW LEVEL SECURITY;

--
-- Name: media_asset; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_asset ENABLE ROW LEVEL SECURITY;

--
-- Name: user; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict biT20JimjqhO40IHWRLKhYBoTh6z0iOhEYOda5Youy5UEdSg0uKiull7w2McMPP

