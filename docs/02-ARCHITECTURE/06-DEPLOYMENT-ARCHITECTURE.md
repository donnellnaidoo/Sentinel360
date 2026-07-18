# Sentinel360 — Deployment Architecture

> **Document:** 06-DEPLOYMENT-ARCHITECTURE.md  
> **Version:** 1.0  
> **Status:** Approved  
> **Last Updated:** June 2026

---

## Architecture Decision: Modular Monolith

### Decision
Sentinel360 will be deployed as a **modular monolith** — a single deployable application with strictly separated domain modules — running on Kubernetes.

### Why Not Microservices?

| Factor | Modular Monolith | Microservices |
|--------|-----------------|---------------|
| **Team Size** | 6 developers | Requires 10+ for operational overhead |
| **Deployment Complexity** | Single Docker image, one CI/CD pipeline | Multi-repo, multi-pipeline, service mesh |
| **Development Velocity** | Faster iteration, simpler debugging | Slower initial velocity; coordination overhead |
| **Distributed Transactions** | ACID within single database | Saga patterns, eventual consistency |
| **Testing** | Integration tests without network mocking | Complex contract testing, consumer-driven tests |
| **Scaling** | Whole application scales together | Independent service scaling (benefit) |

### When Will We Extract?

Extraction to microservices happens when **at least one** of these conditions is met:

1. **Independent scaling requirement** — e.g., AI Orchestrator needs GPU scaling independently of API services
2. **Team autonomy** — Team splits into >2 squads owning distinct domains
3. **Technology divergence** — A domain needs a different runtime, database, or tech stack

### Extraction Path

Clean extraction is possible because modules are already isolated:

1. Extract the module into its own NestJS application
2. Add an API layer (gRPC for internal services, REST for external)
3. Replace in-memory service calls with gRPC client stubs
4. Extract associated database tables into owner schema or database
5. Deploy as a new Kubernetes service with its own HPA

---

## Containerization Strategy

### Base Image

```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache tini ffmpeg curl
WORKDIR /app

# Development
FROM base AS development
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
EXPOSE 3000
ENTRYPOINT ["tini", "--"]
CMD ["npm", "run", "start:dev"]

# Build
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM node:20-alpine AS production
RUN apk add --no-cache tini curl
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health/ready || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/main"]
```

### Image Strategy

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Base image** | `node:20-alpine` | Minimal footprint (120MB vs 1GB+ for full) |
| **Multi-stage** | 3 stages (dev → build → prod) | Production image contains only runtime deps |
| **Distroless?** | No (use Alpine) | Need shell for health checks and debugging |
| **Image scanning** | Trivy in CI/CD pipeline | CVE scanning before registry push |
| **Tagging** | `git-sha` (immutable) + `latest` | Traceable deployments; immutable tags prevent drift |
| **Registry** | ECR / GCR / Docker Registry | Private registry within cloud provider |

---

## Kubernetes Architecture

### Cluster Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster (EKS/GKE)                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Namespace: sentinel360-api                                 │     │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │     │
│  │  │ api-gateway   │ │ backend-app  │ │ websocket-server │   │     │
│  │  │ (Kong)        │ │ (modular     │ │ (Socket.IO)      │   │     │
│  │  │ Replicas: 2-5 │ │  monolith)   │ │ Replicas: 2-4    │   │     │
│  │  │ HPA: CPU 70%  │ │ Replicas: 2-6│ │ HPA: CPU 70%    │   │     │
│  │  └──────────────┘ │ HPA: CPU 75% │ └──────────────────┘   │     │
│  │                    │ + req/sec    │                        │     │
│  │                    └──────────────┘                        │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Namespace: sentinel360-workers                             │     │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │     │
│  │  │ video-        │ │ report-      │ │ alert-           │   │     │
│  │  │ processor     │ │ generator    │ │ dispatcher       │   │     │
│  │  │ Replicas: 2-10│ │ Replicas: 2-4│ │ Replicas: 2-4   │   │     │
│  │  │ HPA: queue    │ │ HPA: queue   │ │ HPA: queue       │   │     │
│  │  │ depth + CPU   │ │ depth        │ │ depth            │   │     │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘   │     │
│  │  ┌──────────────┐ ┌──────────────┐                        │     │
│  │  │ confidence-   │ │ evidence-    │                        │     │
│  │  │ scorer        │ │ hasher       │                        │     │
│  │  │ Replicas: 2-4 │ │ Replicas: 1-2│                        │     │
│  │  └──────────────┘ └──────────────┘                        │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Namespace: sentinel360-ai                                  │     │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │     │
│  │  │ face-reid     │ │ entity-      │ │ model-registry   │   │     │
│  │  │ (GPU)         │ │ resolver     │ │ (MLflow)         │   │     │
│  │  │ Replicas: 1-2 │ │ Replicas: 1-2│ │ Replicas: 1     │   │     │
│  │  │ HPA: GPU util │ │ HPA: CPU 70% │ │                  │   │     │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘   │     │
│  │  ┌──────────────────────────────────────────────────────┐ │     │
│  │  │  3d-reconstruction (Batch Job, GPU)                   │ │     │
│  │  │  - Triggered by Kafka event                           │ │     │
│  │  │  - Runs as Kubernetes Job (not deployment)            │ │     │
│  │  │  - Uses A100 GPU for 5-15 minutes per job             │ │     │
│  │  └──────────────────────────────────────────────────────┘ │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Namespace: sentinel360-storage (External Services)         │     │
│  │  (Managed by cloud provider, accessed via private endpoints) │     │
│  │                                                              │     │
│  │  - RDS PostgreSQL (Multi-AZ, read replicas)                  │     │
│  │  - ElastiCache Redis (cluster mode)                          │     │
│  │  - MSK Kafka (3 brokers, multi-AZ)                            │     │
│  │  - S3 (Standard + Glacier tiers)                             │     │
│  │  - AOS Elasticsearch (3 master + 6 data nodes)              │     │
│  │  - CloudFront CDN                                            │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### Horizontal Pod Autoscaling

| Workload | Metric | Min | Max | Scale-Up | Scale-Down |
|----------|--------|-----|-----|----------|------------|
| **Backend App** | CPU @ 75% + req/sec @ 1000 | 2 | 6 | 30s | 300s |
| **API Gateway** | CPU @ 70% | 2 | 5 | 30s | 300s |
| **WebSocket** | CPU @ 70% + connections | 2 | 4 | 60s | 300s |
| **Video Processor** | Queue depth @ 100 | 2 | 10 | Immediate | 120s |
| **Face Re-ID** | GPU utilization @ 70% | 1 | 2 | 60s | 300s |
| **Alert Dispatcher** | Queue depth @ 50 | 2 | 4 | Immediate | 120s |

### Resource Requests & Limits

| Pod | CPU Request | CPU Limit | RAM Request | RAM Limit | GPU |
|-----|-------------|-----------|-------------|-----------|-----|
| **Backend App** | 500m | 1.5 | 512Mi | 1Gi | — |
| **API Gateway** | 500m | 1.0 | 512Mi | 1Gi | — |
| **WebSocket** | 250m | 1.0 | 256Mi | 512Mi | — |
| **Video Processor** | 1.0 | 2.0 | 1Gi | 2Gi | — |
| **Alert Dispatcher** | 250m | 500m | 256Mi | 512Mi | — |
| **Face Re-ID** | 2.0 | 4.0 | 4Gi | 8Gi | 1× T4 |
| **3D Reconstruction** | 4.0 | 8.0 | 16Gi | 32Gi | 1× A100 |

---

## Database Scaling Strategy

### Read Replicas

```
┌──────────────┐      ┌──────────────────┐
│  Primary     │─────►│  Read Replica 1  │
│  (Write)     │      │  (Analytics,     │
│  db.r6g.xl   │      │   Reports,       │
│  500GB gp3   │      │   Dashboards)    │
│              │      │  db.r6g.large    │
└──────┬───────┘      └──────────────────┘
       │              ┌──────────────────┐
       └─────────────►│  Read Replica 2  │
                      │  (API Read       │
                      │   Operations)    │
                      │  db.r6g.large    │
                      └──────────────────┘
```

| Query Type | Route To | Rationale |
|------------|----------|-----------|
| All writes (POST, PATCH, DELETE) | Primary | ACID compliance |
| Real-time API reads (GET) | Replica 2 | Low latency, consistent |
| Analytics queries | Replica 1 | Heavy queries, can be slow |
| Public feed (read-only) | Replica 2 | High volume, cacheable |
| Audit log queries | Replica 1 | Complex search, not latency-sensitive |

### Connection Pooling

- **Backend → Primary:** PgBouncer (transaction pooling, max 100 connections)
- **Backend → Replicas:** PgBouncer (session pooling, max 200 connections per replica)
- **Background workers:** Direct connections with connection limit per worker type

### Sharding Decision

**Current Approach: No sharding.** The expected data volume (<10 TB over 3 years) fits comfortably on a single PostgreSQL instance with read replicas.

**Trigger for sharding:** When the primary database exceeds 5 TB or write throughput exceeds 5000 TPS sustained.

**Future sharding strategy:** Application-level sharding by `organization_id` or by `region` (e.g., Western Cape, Gauteng, KZN), with a shard map service.

---

## Video Processing Scaling

### Processing Topology

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Edge     │──►│ Kafka    │──►│ Video    │──►│ S3       │
│ Devices  │   │ (video-  │   │ Processor│   │ (Processed│
│ (N=1000) │   │  frames) │   │ (2-10)   │   │  Video)   │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
                                      │
                               ┌──────▼──────┐
                               │ AI Inference│
                               │ Queue       │
                               │ (Kafka)     │
                               └──────┬──────┘
                                      │
                               ┌──────▼──────┐
                               │ AI Worker   │
                               │ (GPU Pod)   │
                               └─────────────┘
```

### Video Processing Pipeline

```
Edge Device:
  360° Camera → RTSP → Frame Grabber (5 FPS) → Batch (60 frames) → Kafka
                                                    ↑
Edge AI Inference (parallel):                      │
  ├── Face Detection → Embedding → Kafka           │
  ├── ALPR → OCR → Plate Text → Kafka              │
  ├── Behaviour Analysis → Anomaly Score → Kafka    │
  └── Motion Tracking → Tracklets → Kafka ─────────┘

Cloud:
  Kafka → Video Processor Worker:
    1. Frame batch from S3
    2. H.264/H.265 encoding
    3. Generate thumbnail + preview clip
    4. Store processed video + metadata in S3
    5. Publish processing.complete event
    
  Kafka → AI Cloud Worker:
    1. Face Re-ID (compare against gallery)
    2. Entity Resolution (de-duplicate)
    3. Confidence Scoring (cascade)
    4. If threshold exceeded → Alert + Evidence
```

### Scaling Formula

```
Required Video Processors = ceil(
    (Total Cameras × FPS × Frame Size) /
    (Single Processor Throughput)
)

Example:
  1000 cameras × 5 FPS × 2MB (JPEG at 1080p) = 10,000 MB/s = ~80 Gbps
  
  Single Video Processor throughput (1 CPU core): ~50 Mbps
  Required: 80,000 Mbps / 50 Mbps = 1,600 cores
  
  With 2 CPU cores per pod: 800 pods
  With GPU acceleration (NVENC): ~500 Mbps per pod → 80 pods
  
  Target: 10-20 video processor pods with NVENC acceleration
```

---

## CDN Strategy

### Architecture

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│ Origin   │──────►│ CDN      │──────►│ Client   │
│ (S3)     │       │ (Cloud-  │       │ (Browser)│
│          │       │  Front)  │       │          │
└──────────┘       └──────────┘       └──────────┘
     │                   │
     │   Signed URLs     │   Signed URLs
     │   (Private)       │   + Public Cache
     │                   │   (Public Assets)
     ▼                   ▼
┌──────────┐       ┌──────────┐
│ Lambda@  │       │ WAF      │
│ Edge     │       │ Rules    │
│ (Auth    │       │          │
│  Check)  │       │          │
└──────────┘       └──────────┘
```

### Content Routing

| Path Prefix | Cache Behavior | Auth Required | CDN TTL |
|-------------|---------------|---------------|---------|
| `/public/*` | Cache all | No | 1 hour |
| `/snapshots/*` | No cache (signed URLs) | Yes (Lambda@Edge) | 0 |
| `/evidence/*` | No cache (signed URLs) | Yes (Lambda@Edge) | 0 |
| `/3d-models/*` | Cache by version | Yes (query param) | 24 hours |
| `/static/*` | Cache aggressively | No | 1 year |
| `/sightings/*` | No cache (signed URLs) | Yes (Lambda@Edge) | 0 |

### Signed URL Generation

```typescript
// Evidence download with presigned URL
// S3 presigned URL valid for 15 minutes
// Access validated by backend before generating URL

async function getEvidenceDownloadUrl(evidenceId: string, userId: string): Promise<string> {
  // 1. Verify user has permission to access this evidence
  const hasAccess = await this.evidenceService.checkAccess(evidenceId, userId);
  if (!hasAccess) throw new ForbiddenException();
  
  // 2. Log access in chain of custody
  await this.chainOfCustodyService.record({
    evidenceId,
    action: 'accessed',
    userId,
    timestamp: new Date()
  });
  
  // 3. Generate presigned URL (15 min TTL)
  return this.s3Service.getPresignedUrl(
    evidence.s3Key,
    900 // 15 minutes in seconds
  );
}
```

---

## CI/CD Pipeline

### Pipeline Stages

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ 1. Lint  │──►│ 2. Test  │──►│ 3. Build │──►│ 4. Scan  │──►│ 5. Push  │
│ & Type   │   │ (Unit +  │   │ (Docker  │   │ (Trivy,  │   │ (ECR)    │
│ Check    │   │  Int)    │   │  Image)  │   │  Snyk)   │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘
                                                                  │
                                                         ┌────────▼────────┐
                                                         │ 6. Deploy       │
                                                         │ (ArgoCD)        │
                                                         │                 │
                                                         │ Staging →       │
                                                         │ Prod (manual)   │
                                                         └─────────────────┘
```

### Deployment Environments

| Environment | Purpose | Auto-deploy | Database | Scaling |
|-------------|---------|-------------|----------|---------|
| **Development** | Feature development, unit tests | Every PR merge | Shared dev DB | Single replica |
| **Staging** | Integration testing, QA, UAT | Every main merge | Staging clone | Limited (2 pods) |
| **Production** | Live system | Manual promotion from staging | Full prod (Multi-AZ) | Full autoscaling |

### Blue-Green Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Blue-Green Strategy                       │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │  Blue (Active)      │    │  Green (Incoming)    │         │
│  │  v1.0.3             │    │  v1.1.0              │         │
│  │                     │    │                      │         │
│  │  Service: backend   │    │  Service: backend-   │         │
│  │  Image: v1.0.3      │    │  green               │         │
│  │  Replicas: 4        │    │  Image: v1.1.0       │         │
│  │                     │    │  Replicas: 4         │         │
│  └──────────┬──────────┘    └──────────┬───────────┘         │
│             │                          │                     │
│             │     Switch Load Balancer │                     │
│             └──────────────────────────┘                     │
│                                                              │
│  1. Deploy Green (new version) in parallel                   │
│  2. Run smoke tests against Green                            │
│  3. Switch load balancer from Blue → Green                   │
│  4. Keep Blue running for 15 minutes (rollback window)       │
│  5. Terminate Blue after successful monitoring               │
└─────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability

### Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Metrics** | Prometheus + Grafana | System metrics (CPU, memory, request latency, queue depth) |
| **Logging** | CloudWatch Logs / Loki | Centralized structured logging |
| **Tracing** | OpenTelemetry + Jaeger | Distributed tracing across services |
| **Alerting** | AlertManager + PagerDuty | Incident alerting |
| **Dashboards** | Grafana (custom dashboards) | Business + technical dashboards |
| **Uptime** | CloudWatch Synthetics | Synthetic monitoring of critical user journeys |

### Key Metrics Dashboards

| Dashboard | Audience | Key Metrics |
|-----------|----------|-------------|
| **System Health** | DevOps | CPU/memory per pod, DB connections, Kafka lag, error rates |
| **API Performance** | Backend Team | p50/p95/p99 latency, requests/sec, error rate by endpoint |
| **AI Pipeline** | ML Team | Inference latency, model accuracy, queue depths, false positive rate |
| **Business KPIs** | Product/Stakeholders | Active cases, alerts generated, sightings submitted, verification rate |
| **Security** | Security Team | Failed logins, permission denials, evidence access, audit log volume |

### Alert Thresholds

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| API p95 latency > 2s | Over 5-minute window | Critical | PagerDuty + Slack |
| Error rate > 5% | Over 5-minute window | Critical | PagerDuty + Slack |
| Kafka consumer lag > 10,000 | Any consumer group | High | PagerDuty + Slack |
| DB connection count > 80% | Primary database | Critical | PagerDuty + Slack |
| Disk space > 85% | Any persistent volume | High | Slack |
| Evidence hash mismatch | Chain verification fails | Critical | PagerDuty + phone |
| Failed login spike | >10/min from same IP | Medium | Slack |
| AI model accuracy drop | >5% below baseline | High | Slack + email |

---

## Disaster Recovery

### RTO / RPO Targets

| Tier | Recovery Time Objective (RTO) | Recovery Point Objective (RPO) |
|------|-------------------------------|-------------------------------|
| **Critical** (evidence, cases, alerts) | 1 hour | 5 minutes |
| **High** (user data, sightings) | 4 hours | 15 minutes |
| **Medium** (analytics, reports) | 8 hours | 1 hour |
| **Low** (audit logs, raw video) | 24 hours | 24 hours |

### Backup Strategy

| Data | Backup Method | Frequency | Retention | Restore Time |
|------|--------------|-----------|-----------|-------------|
| PostgreSQL | WAL streaming to S3 + daily snapshots | Continuous (WAL) + Daily (snapshot) | 30 days (snapshot), 7 days (WAL) | 1 hour (full restore) |
| S3 Media | Cross-region replication | Real-time | Indefinite (with lifecycle to Glacier after 365 days) | Immediate (via replica) |
| Redis | RDB snapshots to S3 | Every 6 hours | 7 days | 15 minutes |
| Kafka | Data replicated across 3 AZs | Real-time | Per topic retention | 30 minutes (replay from last committed offset) |
| Application Config | Git (Infrastructure as Code) | Every commit | Indefinite | 15 minutes (re-deploy) |

### Disaster Recovery Playbook

| Scenario | Response | RTO |
|----------|----------|-----|
| **Single AZ failure** | Kubernetes reschedules pods to remaining AZs | <5 minutes |
| **Whole region failure** | Manual failover to DR region (us-east-1 → eu-west-1) | <1 hour |
| **Database corruption** | Restore from latest WAL + snapshot | <1 hour |
| **Data breach** | Incident response plan; isolate compromised systems | <15 minutes |
| **Ransomware** | Restore from immutable S3 backups (Object Lock enabled) | <4 hours |

---

## Multi-Region Strategy (Future)

```
┌──────────────────────┐     ┌──────────────────────┐
│ Primary Region       │     │  DR Region            │
│ (us-east-1)          │     │  (eu-west-1)          │
│                      │     │                       │
│  ┌────────────────┐  │     │  ┌────────────────┐  │
│  │ Kubernetes     │  │     │  │ Kubernetes     │  │
│  │ Cluster        │  │     │  │ Cluster        │  │
│  └────────────────┘  │     │  └────────────────┘  │
│  ┌────────────────┐  │     │  ┌────────────────┐  │
│  │ RDS Primary    │◄├─────┤──│ RDS Read        │  │
│  │ (Multi-AZ)     │  │     │  │ Replica        │  │
│  └────────────────┘  │     │  └────────────────┘  │
│  ┌────────────────┐  │     │  ┌────────────────┐  │
│  │ S3 (Standard)  │──├─────┼─►│ S3 (Cross-     │  │
│  │                │  │     │  │  Region Repl.) │  │
│  └────────────────┘  │     │  └────────────────┘  │
└──────────────────────┘     └──────────────────────┘
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Software Architect | Initial deployment architecture |
