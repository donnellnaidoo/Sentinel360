# Phase 6: Scale — Integrations, Audit & Infrastructure

> **Sentinel360 Implementation Plan — Phase 6**
> **Version:** 1.0 | **Last Updated:** June 2026
> **Estimated Effort:** 4–5 weeks / 160–200 person-hours
> **Dependencies:** All previous phases (Phase 1–5)

---

## 1. Objective

Complete the Sentinel360 system by implementing external integrations, comprehensive audit logging, compliance reporting, system configuration management, and production infrastructure hardening. This phase transforms the system from a functional prototype into a production-ready, auditable, and integrable platform that can connect with external law enforcement case management systems, generate compliance reports, and scale horizontally under load.

**Corresponding Requirements:**
- **US-18** — View Audit Logs (Super Admin)
- **§5.5** — Structured Incident Reporting & Metadata Integration (LEO metadata integration, XML/JSON export)
- **§6.1** — System Performance and Scalability (elastic compute, data throughput)
- **§6.3** — Data Security and Integrity (encryption, access control, chain of custody)
- **§8** — Architecture Overview (all layers: infrastructure, data, AI, application, users)

---

## 2. Key Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | **Database — Integration & Infra schema** | External integrations, webhook endpoints, webhook delivery logs, audit_logs (partitioned), infrastructure metrics, system_config, feature_flags |
| 2 | **External integration service** | Register/manage third-party system connections (LEO case management, external databases) |
| 3 | **Webhook engine** | Event-driven webhook delivery with HMAC signing, retry, and logging |
| 4 | **Audit log service** | Centralised immutable audit logging for all system actions; partitioned time-based storage |
| 5 | **Compliance & reporting engine** | Generate compliance reports, evidence bundles, case export (XML/JSON) |
| 6 | **System configuration service** | Dynamic system configuration with feature flags, env overrides, change auditing |
| 7 | **Infrastructure monitoring** | API performance metrics, database query profiling, queue depth monitoring |
| 8 | **Super Admin dashboard** | Full system oversight: audit log viewer, integration management, infrastructure dashboard |
| 9 | **Data retention & archival** | Configurable data retention policies, automated archival jobs |
| 10 | **Performance optimisation** | Query optimisation, connection pooling, caching strategy, CDN configuration |
| 11 | **Disaster recovery** | Backup strategy, restore procedures, RPO/RTO documentation |

---

## 3. Database Tables

### 3.1 Schema Additions

| Table | Purpose | Dependencies |
|-------|---------|--------------|
| `external_integrations` | Registered third-party system connections | `organizations` |
| `integration_credentials` | Encrypted API keys/tokens for integrations | `external_integrations` |
| `webhook_endpoints` | Registered webhook callback URLs | `external_integrations` |
| `webhook_delivery_logs` | Webhook delivery attempts and status | `webhook_endpoints` |
| `audit_logs` (partitioned) | Immutable system-wide audit trail (time-partitioned) | `users` |
| `infrastructure_metrics` | Time-series infrastructure performance data | — |
| `infrastructure_alerts` | Infrastructure-level monitoring alerts | — |
| `system_config` | Dynamic system configuration key-value store | `users` (updated_by) |
| `feature_flags` | Feature toggle management | `users` (updated_by) |
| `data_retention_policies` | Configurable data retention rules per entity type | — |
| `data_archives` | Archive job records and status | — |
| `compliance_reports` | Generated compliance report metadata | `users` |
| `export_jobs` | Case/data export job queue | `users` |

### 3.2 Key Tables Detail

#### `external_integrations`
```sql
CREATE TABLE external_integrations (
    id              TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    name            VARCHAR(200) NOT NULL,
    provider        VARCHAR(100) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,
    config          JSONB NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at    TIMESTAMPTZ,
    last_sync_status VARCHAR(30),
    created_by      TEXT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

#### `webhook_endpoints`
```sql
CREATE TABLE webhook_endpoints (
    id              TEXT PRIMARY KEY,
    integration_id  TEXT REFERENCES external_integrations(id) ON DELETE CASCADE,
    url             VARCHAR(512) NOT NULL,
    events          TEXT[] NOT NULL,
    secret          VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    retry_count     INTEGER NOT NULL DEFAULT 3,
    timeout_ms      INTEGER NOT NULL DEFAULT 10000,
    last_delivery_at TIMESTAMPTZ,
    last_delivery_status VARCHAR(30),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `audit_logs` (Partitioned)
```sql
CREATE TABLE audit_logs (
    id              TEXT NOT NULL,
    user_id         TEXT REFERENCES users(id),
    user_role       VARCHAR(50),
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100) NOT NULL,
    resource_id     TEXT,
    description     TEXT,
    metadata        JSONB,
    ip_address      INET NOT NULL,
    user_agent      TEXT,
    session_id      TEXT,
    request_id      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

#### `system_config`
```sql
CREATE TABLE system_config (
    id              TEXT PRIMARY KEY,
    config_key      VARCHAR(200) NOT NULL UNIQUE,
    config_value    JSONB NOT NULL,
    description     TEXT,
    is_encrypted    BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by      TEXT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (config_key, config_value, description) VALUES
    ('alert.default_confidence_threshold', '{"value": 80}', 'Default minimum confidence % for automatic alerts'),
    ('sighting.auto_match_enabled', '{"value": true}', 'Enable automatic AI matching of sightings'),
    ('auth.max_failed_attempts', '{"value": 5}', 'Max failed login attempts before lockout'),
    ('auth.lockout_duration_minutes', '{"value": 30}', 'Account lockout duration'),
    ('storage.retention_days', '{"value": 365}', 'Evidence retention period in days'),
    ('pagination.default_page_size', '{"value": 20}', 'Default records per page'),
    ('pagination.max_page_size', '{"value": 100}', 'Maximum records per page');
```

#### `feature_flags`
```sql
CREATE TABLE feature_flags (
    id              TEXT PRIMARY KEY,
    flag_key        VARCHAR(200) NOT NULL UNIQUE,
    description     TEXT,
    is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    targeting_rules JSONB,
    updated_by      TEXT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (flag_key, description, is_enabled) VALUES
    ('ai.behaviour_detection', 'Enable behaviour anomaly detection', false),
    ('ai.face_recognition', 'Enable facial recognition pipeline', true),
    ('ai.alpr', 'Enable license plate recognition', true),
    ('ai.reid', 'Enable person re-identification', false),
    ('community.sightings', 'Enable community sighting submissions', true),
    ('community.feed', 'Enable community feed', true),
    ('push_notifications', 'Enable push notification delivery', true);
```

### 3.3 Prisma Schema Updates

Add to `packages/db/prisma/schema.prisma`:
- `ExternalIntegration`, `IntegrationCredential`
- `WebhookEndpoint`, `WebhookDeliveryLog`
- `AuditLog` (as raw SQL — Prisma does not support partitioning natively)
- `InfrastructureMetric`, `InfrastructureAlert`
- `SystemConfig`, `FeatureFlag`
- `DataRetentionPolicy`, `DataArchive`
- `ComplianceReport`, `ExportJob`

---

## 4. API Endpoints

### 4.1 Integration Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/admin/integrations` | List external integrations | super_admin |
| `POST`   | `/api/v1/admin/integrations` | Register new integration | super_admin |
| `GET`    | `/api/v1/admin/integrations/{id}` | Get integration details | super_admin |
| `PATCH`  | `/api/v1/admin/integrations/{id}` | Update integration config | super_admin |
| `DELETE` | `/api/v1/admin/integrations/{id}` | Deactivate integration | super_admin |
| `POST`   | `/api/v1/admin/integrations/{id}/test` | Test integration connection | super_admin |
| `GET`    | `/api/v1/admin/integrations/{id}/logs` | Get integration sync logs | super_admin |

### 4.2 Webhook Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/admin/webhooks` | List registered webhooks | super_admin |
| `POST`   | `/api/v1/admin/webhooks` | Register webhook endpoint | super_admin |
| `PATCH`  | `/api/v1/admin/webhooks/{id}` | Update webhook config | super_admin |
| `DELETE` | `/api/v1/admin/webhooks/{id}` | Deactivate webhook | super_admin |
| `POST`   | `/api/v1/admin/webhooks/{id}/test` | Send test event | super_admin |
| `GET`    | `/api/v1/admin/webhooks/{id}/deliveries` | List delivery attempts | super_admin |

### 4.3 Webhook Event Types

| Event | Trigger | Payload Summary |
|-------|---------|-----------------|
| `case.created` | New case created | Case summary, assigned investigator |
| `case.status_changed` | Case status updated | Case ID, old status, new status |
| `case.closed` | Case closed | Full case summary + evidence bundle (JSON/XML) |
| `evidence.verified` | Evidence verified | Evidence metadata + download URL |
| `evidence.uploaded` | New evidence uploaded | Evidence summary, SHA-256 hash |
| `sighting.verified` | Sighting confirmed | Sighting details + matched profile |
| `sighting.submitted` | New sighting report | Sighting summary, location |
| `alert.critical` | Critical alert published | Alert details + location |
| `profile.status_changed` | Criminal profile status changed | Profile ID, old/new status |
| `ai.match_found` | AI match above threshold | Match details, confidence, evidence link |

### 4.4 Audit Log Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/admin/audit-logs` | Query audit logs (paginated, filterable) | super_admin |
| `GET`    | `/api/v1/admin/audit-logs/export` | Export audit logs (CSV/JSON) | super_admin |
| `GET`    | `/api/v1/admin/audit-logs/stats` | Audit log statistics | super_admin |
| `GET`    | `/api/v1/admin/audit-logs/{id}` | Get single audit entry | super_admin |

### 4.5 System Configuration Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/admin/system-config` | List all config entries | super_admin |
| `GET`    | `/api/v1/admin/system-config/{key}` | Get single config value | super_admin |
| `PATCH`  | `/api/v1/admin/system-config/{key}` | Update config value | super_admin |
| `GET`    | `/api/v1/admin/feature-flags` | List all feature flags | super_admin |
| `PATCH`  | `/api/v1/admin/feature-flags/{key}` | Toggle feature flag | super_admin |

### 4.6 Compliance & Export Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `POST`   | `/api/v1/admin/export/case/{caseId}` | Export case as JSON/XML | admin, super_admin |
| `GET`    | `/api/v1/admin/export/jobs` | List export jobs | admin, super_admin |
| `GET`    | `/api/v1/admin/export/jobs/{id}/download` | Download export file | admin, super_admin |
| `POST`   | `/api/v1/admin/compliance/generate` | Generate compliance report | super_admin |
| `GET`    | `/api/v1/admin/compliance/reports` | List generated reports | super_admin |
| `GET`    | `/api/v1/admin/compliance/reports/{id}` | Get report details | super_admin |

### 4.7 Infrastructure Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/admin/infrastructure/dashboard` | Infrastructure dashboard data | super_admin |
| `GET`    | `/api/v1/admin/infrastructure/performance` | API performance metrics | super_admin |
| `GET`    | `/api/v1/admin/infrastructure/queues` | Queue depths and status | super_admin |
| `GET`    | `/api/v1/admin/infrastructure/database` | Database connection pool status | super_admin |
| `GET`    | `/api/v1/admin/infrastructure/storage` | Storage usage and metrics | super_admin |

### 4.8 Data Management Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/admin/data/retention-policies` | List retention policies | super_admin |
| `PATCH`  | `/api/v1/admin/data/retention-policies/{id}` | Update retention policy | super_admin |
| `POST`   | `/api/v1/admin/data/archive` | Trigger manual archival | super_admin |
| `GET`    | `/api/v1/admin/data/archives` | List archive jobs | super_admin |

---

## 5. Frontend Components (Web — Next.js)

### 5.1 Route Structure

| Route | Component | Description | Auth |
|-------|-----------|-------------|------|
| `/admin` | `AdminDashboardPage` | Super Admin landing with summary metrics | super_admin |
| `/admin/audit-logs` | `AuditLogViewerPage` | Queryable, filterable audit log table | super_admin |
| `/admin/integrations` | `IntegrationManagementPage` | External integration CRUD | super_admin |
| `/admin/integrations/{id}` | `IntegrationDetailPage` | Integration config, sync logs | super_admin |
| `/admin/webhooks` | `WebhookManagementPage` | Webhook endpoint CRUD | super_admin |
| `/admin/webhooks/{id}` | `WebhookDetailPage` | Webhook config, delivery history | super_admin |
| `/admin/system-config` | `SystemConfigPage` | System configuration editor | super_admin |
| `/admin/feature-flags` | `FeatureFlagPage` | Feature toggle management | super_admin |
| `/admin/infrastructure` | `InfrastructureDashboard` | Performance metrics, queue depths, storage | super_admin |
| `/admin/data/retention` | `DataRetentionPage` | Retention policy configuration | super_admin |
| `/admin/data/archives` | `DataArchivePage` | Archival job management | super_admin |
| `/admin/compliance` | `CompliancePage` | Compliance report generation and download | super_admin |
| `/admin/export` | `ExportPage` | Case/data export interface | admin+ |

### 5.2 Key Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `AdminSidebar` | Navigation sidebar for Super Admin section | All admin pages |
| `AdminMetricCard` | Summary stat card (total users, cases, evidence, alerts) | AdminDashboardPage |
| `AuditLogTable` | Searchable, filterable audit log with column sorting | AuditLogViewerPage |
| `AuditLogDetail` | Single audit entry expanded view | AuditLogViewerPage |
| `AuditLogExportButton` | Export to CSV/JSON with date range selector | AuditLogViewerPage |
| `IntegrationCard` | Integration summary with status indicator | IntegrationManagementPage |
| `IntegrationForm` | Create/edit integration config form | IntegrationDetailPage |
| `WebhookTable` | Webhook endpoint list with event type tags | WebhookManagementPage |
| `WebhookForm` | Register/edit webhook with event selection | WebhookDetailPage |
| `WebhookDeliveryList` | Delivery attempt log with status badges | WebhookDetailPage |
| `ConfigEditor` | Key-value config editor with validation | SystemConfigPage |
| `FeatureToggle` | Toggle switch for feature flags | FeatureFlagPage |
| `InfrastructureMetricChart` | Time-series chart for performance data | InfrastructureDashboard |
| `QueueDepthCard` | Bull queue depth and status indicator | InfrastructureDashboard |
| `DatabasePoolCard` | DB connection pool utilisation | InfrastructureDashboard |
| `StorageUsageCard` | S3/MinIO storage usage breakdown | InfrastructureDashboard |
| `RetentionPolicyForm` | Per-entity retention rule editor | DataRetentionPage |
| `ArchiveJobTable` | Archive job list with status, size | DataArchivePage |
| `ComplianceReportCard` | Generated report summary with download | CompliancePage |
| `ExportJobCard` | Export job with progress and download | ExportPage |
| `DataDeletionConfirmDialog` | 2FA-confirmed permanent deletion dialog | Multiple |

---

## 6. Mobile Screens (Expo)

| Screen | Route | Description | Auth |
|--------|-------|-------------|------|
| `AdminDashboardScreen` | `/admin` | Super Admin dashboard (read-only key metrics) | super_admin |
| `AuditLogScreen` | `/admin/audit-logs` | View recent audit log entries | super_admin |

---

## 7. Testing Focus

### 7.1 Unit Tests

| Area | Tests | Coverage |
|------|-------|----------|
| **Webhook engine** | HMAC signing, delivery, retry logic, timeout handling | 95%+ |
| **Audit log service** | Log creation, partitioning, query by date range, export formatting | 95%+ |
| **Integration service** | Credential encryption, connection testing, sync status tracking | 90%+ |
| **System config service** | CRUD, validation, encrypted value handling, change auditing | 95%+ |
| **Feature flag service** | Toggle, targeting rule evaluation, caching | 95%+ |
| **Export service** | Case bundling, XML/JSON generation, file streaming | 90%+ |
| **Compliance reporting** | Data aggregation, report generation, date-range filtering | 90%+ |
| **Data retention / archival** | Policy enforcement, archival scheduling, restore | 90%+ |

### 7.2 Integration Tests

| Test | Description |
|------|-------------|
| Webhook delivery lifecycle | Register endpoint → trigger event → verify delivery → log status |
| Webhook retry on failure | Endpoint returns 500 → verify 3 retries → mark as failed |
| Audit log query + export | Create 100 log entries → query by date/user/action → export CSV |
| System config update audit | Update config → verify audit trail entry created |
| Feature flag toggling | Toggle flag → verify feature behaviour changes |
| Case export flow | Export case as JSON → verify all relations included → file downloadable |
| Integration test connection | Mock external endpoint → test connection → verify result |

### 7.3 E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| `audit-log-viewer.spec.ts` | Browse, search, filter, export audit logs |
| `integration-crud.spec.ts` | Create, edit, test, deactivate integration |
| `webhook-management.spec.ts` | Register webhook, view delivery history |
| `system-config.spec.ts` | View and update system configuration |
| `feature-flags.spec.ts` | Toggle feature flags, verify effect |
| `infrastructure-dashboard.spec.ts` | View infrastructure metrics |
| `compliance-report.spec.ts` | Generate and download compliance report |
| `data-export.spec.ts` | Export case data and download file |
| `data-retention.spec.ts` | Update retention policy, verify archival |

---

## 8. Estimated Effort Breakdown

| Task | Hours | Assigned To |
|------|-------|-------------|
| **Database — Integration & Infra schema** (Prisma + raw SQL for partitioning) | 10 | Backend Dev |
| **External integration service** (CRUD, credential encryption, connection testing) | 14 | Full Stack Dev |
| **Webhook engine** (registration, HMAC signing, delivery, retry, logging) | 18 | Backend Dev |
| **Audit log service** (immutable logging, partitioning, query, export) | 16 | Backend Dev |
| **Compliance & reporting engine** (report generation, XML/JSON export, case bundling) | 16 | Full Stack Dev |
| **System configuration service** (CRUD, feature flags, encryption, change audit) | 12 | Backend Dev |
| **Infrastructure monitoring** (metrics collection, queue monitoring, database stats) | 12 | Full Stack Dev |
| **Data retention & archival service** | 10 | Backend Dev |
| **Web: Super Admin dashboard** | 10 | Frontend Dev |
| **Web: Audit log viewer** (table, filters, export) | 14 | Frontend Dev |
| **Web: Integration management pages** | 12 | Frontend Dev |
| **Web: Webhook management pages** | 10 | Frontend Dev |
| **Web: System config & feature flags pages** | 10 | Frontend Dev |
| **Web: Infrastructure dashboard** (charts, metrics cards) | 14 | Frontend Dev |
| **Web: Data management pages** (retention, archives) | 8 | Frontend Dev |
| **Web: Compliance & export pages** | 10 | Frontend Dev |
| **Mobile: Admin dashboard screen** | 6 | Frontend Dev |
| **Performance optimisation** (query optimisation, caching, CDN) | 20 | Full Stack Dev |
| **Disaster recovery** (backup strategy, restore procedures, RPO/RTO docs) | 8 | Full Stack Dev |
| **Tests** (unit, integration, E2E) | 20 | All |
| **Documentation** (integration guide, admin guide, operations runbook) | 8 | PM / BA |
| **Total** | **268** | |

---

## 9. Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook delivery to external systems unreliable | Data sync failures | Retry with exponential backoff (3 attempts); dead-letter queue for manual review |
| Audit log table growth impacts performance | Slow queries on large audit logs | Monthly partitioning; archive partitions > 12 months to cold storage |
| External integration API changes break sync | Failed data exchange | Versioned integration configs; integration health monitoring with alerting |
| Data retention policy conflicts with legal requirements | Compliance violations | Retention policies configurable per entity type; legal hold override |
| Infrastructure monitoring overhead | Added latency | Minimal instrumentation in hot path; sampled metrics for high-throughput endpoints |

---

## 10. Infrastructure Hardening

### 10.1 Performance Optimisation

| Area | Optimisation | Expected Improvement |
|------|-------------|---------------------|
| **Database queries** | Add composite indexes for top-10 slowest queries | 50–80% query time reduction |
| **Connection pooling** | Tune Prisma connection pool (min 5, max 20) | Reduced connection churn |
| **Caching** | Redis cache for: role permissions, system config, feature flags, public feed | 60–80% reduction in DB reads |
| **CDN** | CloudFront/CDN for evidence media, profile photos, 3D models | 70–90% latency reduction |
| **API response** | Compression (brotli), pagination limits, field selection | 40–60% payload size reduction |
| **Background jobs** | Bull queue concurrency tuning, job deduplication | 30–50% faster job processing |

### 10.2 Security Hardening

| Area | Measure |
|------|---------|
| **API** | Rate limiting per role tier; CORS strict origin; CSP headers |
| **Auth** | Account lockout after 5 failed attempts; TOTP for Super Admin |
| **Data** | AES-256 encryption at rest; TLS 1.3 in transit |
| **Evidence** | SHA-256 chain of custody; immutable audit trail |
| **Infrastructure** | Docker seccomp profiles; read-only root filesystem; non-root user |

### 10.3 Disaster Recovery

| Metric | Target |
|--------|--------|
| **Recovery Point Objective (RPO)** | 5 minutes (WAL streaming) |
| **Recovery Time Objective (RTO)** | 30 minutes (auto-scaling group) |
| **Backup schedule** | PostgreSQL: continuous WAL archiving + daily snapshot; S3: versioning enabled |
| **Restore procedure** | Documented runbook; semi-automated restore script |

---

## 11. Definition of Done

- [ ] All integration, webhook, audit, and infrastructure tables created and migrated
- [ ] External integration CRUD operational with credential encryption
- [ ] Webhook engine delivering events with HMAC signing and retry
- [ ] Audit log service recording all system actions with immutable, partitioned storage
- [ ] Audit logs queryable, filterable, and exportable (CSV/JSON)
- [ ] System configuration and feature flags live-updatable without deployment
- [ ] Infrastructure dashboard showing real-time performance metrics
- [ ] Case data exportable as JSON/XML with all relations bundled
- [ ] Compliance reports generated and downloadable
- [ ] Data retention policies enforceable per entity type
- [ ] Performance optimisation benchmarks met (query time, cache hit ratio, CDN latency)
- [ ] Disaster recovery plan documented and tested
- [ ] Unit + integration test coverage > 85%
- [ ] E2E tests passing for all admin workflows
- [ ] Operations runbook documented for on-call team

---

## 12. Deliverables Summary (All Phases)

| Phase | Name | Tables | API Endpoints | Web Pages | Mobile Screens | Effort |
|-------|------|--------|---------------|-----------|----------------|--------|
| **1** | Auth & RBAC | 9 | ~20 | ~11 | 7 | ~192h |
| **2** | Profiles & Cases | 13 | ~35 | ~10 | 3 | ~226h |
| **3** | Evidence & Sightings | 6 | ~20 | ~10 | 5 | ~220h |
| **4** | Alerts & Community | 10 | ~22 | ~10 | 6 | ~230h |
| **5** | AI & Reconstruction | 16 | ~22 | ~7 | 3 | ~342h |
| **6** | Integrations & Infra | 13 | ~28 | ~12 | 2 | ~268h |
| **Total** | | **67** | **~147** | **~60** | **~26** | **~1478h** |
