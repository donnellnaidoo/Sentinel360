--
-- PostgreSQL database dump
--

\restrict 93gx9aGlO59tzLRVoNkq95SlmM54ScjSXiwcHqG6tbUhYjzKLPcev9VAsTYcpoP

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
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	05836f4f-2888-4ecd-8e81-e75ef061bf0d	authenticated	authenticated	donnellnaidoo6@gmail.com	$2a$10$.UfgUWprCO2LLPuc5w3NW.Y6RNsRFzqv.bgE1ecGihPDGaDmzqPq6	2026-05-03 11:46:01.569986+00	\N		\N		\N			\N	2026-06-13 16:24:26.273963+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-05-03 11:46:01.551682+00	2026-06-13 16:24:26.307368+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
05836f4f-2888-4ecd-8e81-e75ef061bf0d	05836f4f-2888-4ecd-8e81-e75ef061bf0d	{"sub": "05836f4f-2888-4ecd-8e81-e75ef061bf0d", "email": "donnellnaidoo6@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-05-03 11:46:01.564065+00	2026-05-03 11:46:01.564134+00	2026-05-03 11:46:01.564134+00	fbfeae3c-4604-4956-8668-4918f6eb9e6e
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."user" (id, name, email, email_verified, image, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.account (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_model; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_model (id, model_key, display_name, model_type, current_version, status, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: alert; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alert (id, alert_type, title, message, severity, source_domain, source_entity_type, source_entity_id, status, location, metadata, dedup_key, dedup_window_seconds, escalation_level, escalation_sla_seconds, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: alert_acknowledgment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alert_acknowledgment (id, alert_id, user_id, channel, notes, acknowledged_at) FROM stdin;
\.


--
-- Data for Name: alert_routing_rule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alert_routing_rule (id, alert_type, severity_filter, recipient_criteria, channels, escalation_chain, is_active, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: case; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."case" (id, case_number, case_type, title, description, priority, status, assigned_to_user_id, created_by_user_id, closed_at, resolution_notes, created_at, updated_at) FROM stdin;
67d66f04-a87c-4f3f-99a3-e65e486724d2	SR-MPFFNZ3F	Robbery	Cash In Transit Heist	Heist on the M1 on the way to Alberton	MEDIUM	OPEN	\N	\N	\N	\N	2026-05-21 11:54:34.158386+00	2026-05-21 11:54:34.158386+00
9579e013-ae04-4009-a693-16a9e15d4cd5	SR-MPFGL3QW	Robbery	Heist on N1	Two suspects shot at a vehicle.	CRITICAL	OPEN	\N	\N	\N	\N	2026-05-21 12:20:19.816045+00	2026-05-21 12:20:19.816045+00
\.


--
-- Data for Name: anonymous_tip; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.anonymous_tip (id, reference_code, content, location, media_ids, status, linked_case_id, review_notes, created_at) FROM stdin;
\.


--
-- Data for Name: external_integration; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_integration (id, name, integration_type, endpoint_url, auth_method, data_format, status, test_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: api_key; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.api_key (id, integration_id, key_hash, scope_permissions, expiry_date, created_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, event_type, domain, actor_id, actor_type, target_entity_type, target_entity_id, action, payload, ip_address, user_agent, entry_hash, previous_hash, status, created_at) FROM stdin;
\.


--
-- Data for Name: camera; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.camera (id, name, location, device_type, stream_url, capabilities, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: case_evidence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.case_evidence (id, case_id, evidence_entity_type, evidence_entity_id, relationship_description, created_by_user_id, created_at) FROM stdin;
3c48ab70-3bc5-4ca0-92c9-3c769b918ee6	67d66f04-a87c-4f3f-99a3-e65e486724d2	entity_profile	7b008b0a-3f46-445d-9f2d-f902cc2c1f83	\N	\N	2026-05-21 12:07:24.969062+00
350947eb-dc99-4d64-bbf8-3c131e37fc7b	9579e013-ae04-4009-a693-16a9e15d4cd5	incident	12144UUsas78	Main Footage	\N	2026-05-21 12:20:39.003534+00
975b6e8e-3d7d-4fac-8394-a4d046c1076f	9579e013-ae04-4009-a693-16a9e15d4cd5	entity_profile	9478e366-5ebf-4144-b7a7-9de3a14ef809	\N	\N	2026-05-21 12:20:47.39855+00
92d71fc0-0ff6-4598-b4b1-3a72c26a4a35	9579e013-ae04-4009-a693-16a9e15d4cd5	entity_profile	db15ba06-9f8b-479a-afbf-2de80cb4f449	\N	\N	2026-05-21 12:20:52.134997+00
\.


--
-- Data for Name: incident; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incident (id, incident_number, incident_type, title, description, location, occurred_at, severity, status, source_domain, source_entity_type, source_entity_id, reported_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: case_incident; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.case_incident (case_id, incident_id, linked_at) FROM stdin;
\.


--
-- Data for Name: case_report; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.case_report (id, case_id, report_type, title, sections, file_url, file_hash, format, is_signed, generated_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: case_share_record; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.case_share_record (id, case_id, shared_by_user_id, target_agency, integration_id, scope, data_hash, sharing_agreement_ref, shared_at, created_at) FROM stdin;
\.


--
-- Data for Name: chain_of_custody; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chain_of_custody (id, evidence_entity_type, evidence_entity_id, action, from_user_id, to_user_id, reason, evidence_hash, location, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: community_feed_item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.community_feed_item (id, item_type, title, body, location, source_entity_type, source_entity_id, media_url, radius_km, is_pinned, helpful_count, published_at, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: community_interaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.community_interaction (id, user_id, target_entity_type, target_entity_id, interaction_type, created_at) FROM stdin;
\.


--
-- Data for Name: community_preference; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.community_preference (id, user_id, home_location, alert_radius_km, privacy_level, sighting_notifications_enabled, feed_notifications_enabled, push_alerts_enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: community_sighting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.community_sighting (id, reference_code, reporter_user_id, sighting_type, title, description, location, occurred_at, media_ids, status, severity, visibility, operator_notes, linked_incident_id, moderation_status, moderation_reason, reported_at, is_anonymous, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: compliance_check; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.compliance_check (id, framework, check_type, status, findings, recommendations, checked_at, checked_by_user_id, next_check_at, created_at) FROM stdin;
\.


--
-- Data for Name: compliance_report; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.compliance_report (id, title, report_type, date_range_start, date_range_end, content, generated_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: data_classification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_classification (id, level, rank, description, allowed_roles, handling_requirements, retention_override_days, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: deployment_record; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.deployment_record (id, environment, version, status, deployed_by_user_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: monitoring_zone; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monitoring_zone (id, name, boundary_geojson, threat_level, assigned_camera_ids, default_detection_config, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: detection_configuration; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detection_configuration (id, camera_id, zone_id, enabled_detection_types, confidence_threshold, sensitivity, regions_of_interest, active_schedule, is_active, created_by_user_id, updated_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: media_asset; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_asset (id, type, title, description, source, source_camera_id, original_filename, mime_type, file_size, file_hash, storage_url, storage_tier, duration, resolution, codec, framerate, gps_latitude, gps_longitude, status, metadata, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: detection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detection (id, detection_type, classification, confidence, severity, media_asset_id, camera_id, detection_configuration_id, zone_id, timestamp_start, timestamp_end, bounding_box, frame_url, metadata, review_status, reviewed_by_user_id, reviewed_at, escalated_to_incident_id, model_id, model_version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: infrastructure_environment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.infrastructure_environment (id, name, environment_type, region, status, services, infrastructure_template_version, provisioned_at, last_deployment_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: disaster_recovery_event; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.disaster_recovery_event (id, trigger_type, trigger_reason, source_environment_id, target_environment_id, status, failover_started_at, failover_completed_at, restoration_started_at, restoration_completed_at, data_loss_window, initiated_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dispatch_request; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dispatch_request (id, incident_id, dispatch_type, status, assigned_to_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: edge_node; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.edge_node (id, name, location, device_type, hardware_specs, network_address, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: edge_configuration; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.edge_configuration (id, edge_node_id, config, effective_from, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: edge_health_metric; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.edge_health_metric (id, edge_node_id, cpu_utilization, memory_usage, storage_usage, temperature, network_latency, inference_fps, inference_latency_ms, reported_at, created_at) FROM stdin;
\.


--
-- Data for Name: edge_model_deployment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.edge_model_deployment (id, edge_node_id, model_name, model_version, deployment_status, deployed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: edge_node_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.edge_node_config (id, edge_node_id, detection_zones, confidence_thresholds, processing_schedule, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: edge_sync_record; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.edge_sync_record (id, edge_node_id, sync_type, payload_size_bytes, items_count, status, payload_hash, started_at, completed_at, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: emergency_operation_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.emergency_operation_log (id, action, actor_user_id, details, created_at) FROM stdin;
\.


--
-- Data for Name: entity_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.entity_profile (id, entity_type, display_name, primary_face_image_url, primary_face_embedding, known_plate_numbers, attributes, first_seen_at, last_seen_at, detection_count, locations_seen, status, watchlist_status, notes, created_at, updated_at) FROM stdin;
7b008b0a-3f46-445d-9f2d-f902cc2c1f83	person	Marcus Vane	https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop	\N	[]	{}	\N	\N	0	[]	ACTIVE	WANTED	Suspected in multiple transit heists	2026-05-21 12:06:50.1444+00	2026-05-21 12:06:50.1444+00
db15ba06-9f8b-479a-afbf-2de80cb4f449	person	Elena Petrova	https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop	\N	[]	{}	\N	\N	0	[]	ACTIVE	PERSON_OF_INTEREST	Known associate of Marcus Vane	2026-05-21 12:06:50.1444+00	2026-05-21 12:06:50.1444+00
9478e366-5ebf-4144-b7a7-9de3a14ef809	person	Julian Graves	https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop	\N	[]	{}	\N	\N	0	[]	ACTIVE	WANTED	Arms dealer connected to organized crime	2026-05-21 12:06:50.1444+00	2026-05-21 12:06:50.1444+00
08e431bf-878d-4ff4-bc47-4a6d4424ea34	person	Li Wei	https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop	\N	[]	{}	\N	\N	0	[]	ACTIVE	MONITORING	Corporate espionage suspect under surveillance	2026-05-21 12:06:50.1444+00	2026-05-21 12:06:50.1444+00
\.


--
-- Data for Name: entity_match; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.entity_match (id, entity_profile_id, source_entity_type, source_entity_id, similarity_score, matched_at, created_at) FROM stdin;
\.


--
-- Data for Name: entity_track; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.entity_track (id, entity_profile_id, track_status, start_time, end_time, movement_path_geojson, confidence_per_segment, updated_at, created_at) FROM stdin;
\.


--
-- Data for Name: evidence_integrity_check; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evidence_integrity_check (id, evidence_entity_type, evidence_entity_id, computed_hash, stored_hash, is_valid, checked_at, created_at) FROM stdin;
\.


--
-- Data for Name: reconstruction_project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reconstruction_project (id, title, description, location, linked_incident_id, linked_case_id, status, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: evidence_marker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evidence_marker (id, project_id, label, description, evidence_type, linked_evidence_type, linked_evidence_id, coordinates_3d, created_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: law_enforcement_officer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.law_enforcement_officer (id, user_id, badge_number, department, jurisdiction, verification_status, clearance_level, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: evidence_request; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evidence_request (id, requesting_officer_id, case_id, request_type, description, parameters, status, assigned_to_user_id, fulfillment_notes, evidence_ids, requested_at, fulfilled_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: face_detection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.face_detection (id, entity_profile_id, media_asset_id, camera_id, embedding, face_image_url, quality_score, spatial_metadata, detected_at, created_at) FROM stdin;
\.


--
-- Data for Name: feature_flag; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feature_flag (id, name, description, is_enabled, dependencies, rollout_percentage, updated_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: geofence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geofence (id, name, boundary_geojson, rule, entity_filter, enabled, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: geofence_violation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geofence_violation (id, geofence_id, entity_profile_id, violation_type, occurred_at, created_at) FROM stdin;
\.


--
-- Data for Name: infrastructure_event; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.infrastructure_event (id, event_type, severity, details, occurred_at, created_at) FROM stdin;
\.


--
-- Data for Name: integration_export_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.integration_export_log (id, integration_id, export_type, data_count, file_hash, delivery_status, created_at) FROM stdin;
\.


--
-- Data for Name: integration_health; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.integration_health (id, integration_id, response_time_ms, success_rate, last_check_at, created_at) FROM stdin;
\.


--
-- Data for Name: integration_import_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.integration_import_log (id, integration_id, import_type, records_imported, records_failed, created_at) FROM stdin;
\.


--
-- Data for Name: investigation_case; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investigation_case (id, case_number, case_type, title, description, priority, status, assigned_to_user_id, created_by_user_id, closed_at, resolution_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: investigation_note; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investigation_note (id, case_id, note_type, content, created_by_user_id, created_at) FROM stdin;
039961b6-0714-4fe5-9b15-5c5ebb97dd4c	9579e013-ae04-4009-a693-16a9e15d4cd5	GENERAL	Trevor taken in for questioning	\N	2026-05-21 13:56:26.725356+00
\.


--
-- Data for Name: media_annotation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_annotation (id, media_asset_id, annotation_type, value, timestamp_start, timestamp_end, bounding_box, confidence, source, created_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: media_metadata; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_metadata (id, media_asset_id, metadata, extracted_at) FROM stdin;
\.


--
-- Data for Name: retention_policy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.retention_policy (id, policy_name, retention_days, archive_days, deletion_days, applies_to_categories, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: media_retention_record; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_retention_record (id, media_asset_id, retention_policy_id, archived_at, deleted_at, legal_hold_active, hold_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: media_transcoded_variant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_transcoded_variant (id, media_asset_id, variant_label, mime_type, storage_url, file_size, resolution, codec, framerate, created_at) FROM stdin;
\.


--
-- Data for Name: moderation_review; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.moderation_review (id, target_entity_type, target_entity_id, moderation_status, reason, reviewed_by_user_id, reviewed_at, created_at) FROM stdin;
\.


--
-- Data for Name: monitoring_session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monitoring_session (id, operator_user_id, camera_ids, zone_ids, started_at, ended_at, alerts_handled, detections_reviewed, created_at) FROM stdin;
\.


--
-- Data for Name: movement_pattern; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movement_pattern (id, entity_profile_id, zone_id, pattern_type, description, data, frequency, confidence, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: movement_pattern_analysis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movement_pattern_analysis (id, entity_profile_id, time_range_start, time_range_end, common_routes, schedules, anomalies, created_at) FROM stdin;
\.


--
-- Data for Name: movement_prediction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movement_prediction (id, entity_profile_id, predicted_locations, confidence_scores, target_camera_ids, generated_at, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: movement_timeline; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movement_timeline (id, entity_profile_id, time_range_start, time_range_end, timeline_entries, created_at) FROM stdin;
\.


--
-- Data for Name: network_security_rule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.network_security_rule (id, environment_id, rule_name, direction, protocol, source_cidr, destination_cidr, port_range, action, priority, is_active, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification (id, alert_id, recipient_user_id, channel, title, body, delivery_status, sent_at, delivered_at, read_at, error_message, retry_count, action_url, created_at) FROM stdin;
\.


--
-- Data for Name: notification_preference; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_preference (id, user_id, channel_preferences, digest_enabled, digest_frequency, quiet_hours, alert_type_overrides, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: officer_verification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.officer_verification (id, officer_user_id, verifier_user_id, verification_status, notes, verified_at, created_at) FROM stdin;
\.


--
-- Data for Name: operational_report; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operational_report (id, report_type, title, date_range_start, date_range_end, parameters, file_url, file_hash, format, generated_by_user_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: operator_shift; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operator_shift (id, operator_user_id, zone_ids, shift_start, shift_end, status, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permission (id, code, name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: person_attributes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.person_attributes (id, face_detection_id, clothing_description, gender_presentation, estimated_age_range, height_estimate, accessories, extracted_at, created_at) FROM stdin;
\.


--
-- Data for Name: plate_detection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plate_detection (id, entity_profile_id, media_asset_id, camera_id, plate_text, confidence, spatial_metadata, detected_at, created_at) FROM stdin;
\.


--
-- Data for Name: reconstruction_asset; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reconstruction_asset (id, project_id, asset_type, storage_url, scale_metadata, quality_metrics, created_at) FROM stdin;
\.


--
-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role (id, code, name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: role_permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permission (role_id, permission_id) FROM stdin;
\.


--
-- Data for Name: service_instance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_instance (id, service_name, environment_id, version, instance_count, min_instances, max_instances, status, health_check_url, last_health_check_at, resource_allocation, scaling_policy, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: scaling_event; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scaling_event (id, service_instance_id, service_name, environment_id, direction, trigger_metric, trigger_value, threshold, from_count, to_count, status, created_at) FROM stdin;
\.


--
-- Data for Name: scene_annotation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scene_annotation (id, project_id, annotation_type, title, description, position_3d, normal_vector, linked_evidence_id, icon, color, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: scene_measurement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scene_measurement (id, project_id, measurement_type, reference_points, computed_value, unit, accuracy_margin, saved_as_annotation, created_at) FROM stdin;
\.


--
-- Data for Name: security_policy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_policy (id, policy_name, policy_config, created_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id) FROM stdin;
\.


--
-- Data for Name: sighting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sighting (id, entity_track_id, entity_profile_id, camera_id, location, zone_id, observed_at, detection_id, re_id_confidence, dwell_duration_seconds, direction, speed_estimate_mps, frame_url, created_at) FROM stdin;
\.


--
-- Data for Name: sighting_comment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sighting_comment (id, sighting_id, author_id, comment_text, created_at) FROM stdin;
\.


--
-- Data for Name: source_file; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.source_file (id, project_id, file_type, file_url, file_hash, mime_type, file_size, camera_params, gps_location, capture_timestamp, processing_status, rejection_reason, created_at) FROM stdin;
\.


--
-- Data for Name: system_backup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_backup (id, backup_type, scope, status, file_url, file_size_bytes, file_hash, started_at, completed_at, created_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: system_setting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_setting (id, setting_key, setting_value, setting_type, last_modified_by_user_id, updated_at) FROM stdin;
\.


--
-- Data for Name: track_segment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.track_segment (id, entity_track_id, from_sighting_id, to_sighting_id, distance_meters, duration_seconds, speed_mps, is_interpolated, confidence, created_at) FROM stdin;
\.


--
-- Data for Name: user_role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_role (user_id, role_id, assigned_at) FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.verification (id, identifier, value, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: watchlist_entry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.watchlist_entry (id, entity_profile_id, priority_level, reason, case_id, expiry_date, created_by_user_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: webhook_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.webhook_config (id, integration_id, url, events_subscribed, secret_key_hash, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-04-15 16:17:51
20211116045059	2026-04-15 16:17:51
20211116050929	2026-04-15 16:17:51
20211116051442	2026-04-15 16:17:51
20211116212300	2026-04-15 16:17:51
20211116213355	2026-04-15 16:17:51
20211116213934	2026-04-15 16:17:51
20211116214523	2026-04-15 16:17:51
20211122062447	2026-04-15 16:17:51
20211124070109	2026-04-15 16:17:51
20211202204204	2026-04-15 16:17:51
20211202204605	2026-04-15 16:17:51
20211210212804	2026-04-15 16:17:51
20211228014915	2026-04-15 16:17:51
20220107221237	2026-04-15 16:17:51
20220228202821	2026-04-15 16:17:51
20220312004840	2026-04-15 16:17:51
20220603231003	2026-04-15 16:17:51
20220603232444	2026-04-15 16:17:51
20220615214548	2026-04-15 16:17:51
20220712093339	2026-04-15 16:17:51
20220908172859	2026-04-15 16:17:51
20220916233421	2026-04-15 16:17:51
20230119133233	2026-04-15 16:17:51
20230128025114	2026-04-15 16:17:51
20230128025212	2026-04-15 16:17:51
20230227211149	2026-04-15 16:17:51
20230228184745	2026-04-15 16:17:51
20230308225145	2026-04-15 16:17:51
20230328144023	2026-04-15 16:17:51
20231018144023	2026-04-15 16:17:51
20231204144023	2026-04-15 16:17:51
20231204144024	2026-04-15 16:17:51
20231204144025	2026-04-15 16:17:51
20240108234812	2026-04-15 16:17:51
20240109165339	2026-04-15 16:17:51
20240227174441	2026-04-15 16:17:52
20240311171622	2026-04-15 16:17:52
20240321100241	2026-04-15 16:17:52
20240401105812	2026-04-15 16:17:52
20240418121054	2026-04-15 16:17:52
20240523004032	2026-04-15 16:17:52
20240618124746	2026-04-15 16:17:52
20240801235015	2026-04-15 16:17:52
20240805133720	2026-04-15 16:17:52
20240827160934	2026-04-15 16:17:52
20240919163303	2026-04-15 16:17:52
20240919163305	2026-04-15 16:17:52
20241019105805	2026-04-15 16:17:52
20241030150047	2026-04-15 16:17:52
20241108114728	2026-04-15 16:17:52
20241121104152	2026-04-15 16:17:52
20241130184212	2026-04-15 16:17:52
20241220035512	2026-04-15 16:17:52
20241220123912	2026-04-15 16:17:52
20241224161212	2026-04-15 16:17:52
20250107150512	2026-04-15 16:17:52
20250110162412	2026-04-15 16:17:52
20250123174212	2026-04-15 16:17:52
20250128220012	2026-04-15 16:17:52
20250506224012	2026-04-15 16:17:52
20250523164012	2026-04-15 16:17:52
20250714121412	2026-04-15 16:17:52
20250905041441	2026-04-15 16:17:52
20251103001201	2026-04-15 16:17:52
20251120212548	2026-04-15 16:17:52
20251120215549	2026-04-15 16:17:52
20260218120000	2026-04-15 16:17:52
20260326120000	2026-04-15 16:17:52
20260514120000	2026-06-13 16:10:01
20260527120000	2026-06-13 16:10:01
20260528120000	2026-06-13 16:10:01
20260603120000	2026-06-13 16:10:01
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter, selected_columns) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-04-15 12:02:52.673809
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-04-15 12:02:52.710947
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-04-15 12:02:52.715876
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-04-15 12:02:52.739602
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-04-15 12:02:52.750573
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-04-15 12:02:52.754675
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-04-15 12:02:52.759598
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-04-15 12:02:52.764142
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-04-15 12:02:52.7687
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-04-15 12:02:52.773009
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-04-15 12:02:52.7774
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-04-15 12:02:52.781772
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-04-15 12:02:52.786645
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-04-15 12:02:52.791085
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-04-15 12:02:52.796216
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-04-15 12:02:52.822151
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-04-15 12:02:52.826627
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-04-15 12:02:52.83101
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-04-15 12:02:52.835396
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-04-15 12:02:52.841819
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-04-15 12:02:52.846487
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-04-15 12:02:52.852594
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-04-15 12:02:52.867272
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-04-15 12:02:52.877091
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-04-15 12:02:52.881689
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-04-15 12:02:52.886213
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-04-15 12:02:52.890955
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-04-15 12:02:52.894976
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-04-15 12:02:52.899004
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-04-15 12:02:52.902994
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-04-15 12:02:52.907045
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-04-15 12:02:52.911057
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-04-15 12:02:52.915254
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-04-15 12:02:52.919221
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-04-15 12:02:52.923199
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-04-15 12:02:52.927128
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-04-15 12:02:52.931133
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-04-15 12:02:52.935245
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-04-15 12:02:52.940466
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-04-15 12:02:52.951661
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-04-15 12:02:52.955701
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-04-15 12:02:52.959705
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-04-15 12:02:52.96397
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-04-15 12:02:52.968057
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-04-15 12:02:52.972791
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-04-15 12:02:52.978236
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-04-15 12:02:52.993006
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-04-15 12:02:52.997777
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-04-15 12:02:53.001967
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-04-15 12:02:53.016782
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-04-15 12:02:53.021482
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-04-15 12:02:53.349093
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-04-15 12:02:53.350979
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-04-15 12:02:53.361027
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-04-15 12:02:53.363794
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-04-15 12:02:53.36563
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-04-15 12:02:53.376959
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-04-15 12:02:53.381347
56	fix-optimized-search-function	b823ed1e418101032fa01374edc9a436e54e3ed4	2026-04-15 12:02:53.371233
59	drop-unused-functions	38456f13e39691c2bbb4b5151d0d1cdbabd4a8c4	2026-05-21 10:50:30.316318
60	optimize-existing-functions-again	db35e1c91a9201e59f4fef8d972c2f277d68b157	2026-05-21 10:50:30.328557
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 21, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict 93gx9aGlO59tzLRVoNkq95SlmM54ScjSXiwcHqG6tbUhYjzKLPcev9VAsTYcpoP

