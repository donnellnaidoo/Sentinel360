# 07 — Complete File Structure

> **Sentinel360 Backend — Exact File Tree for Production**
> Version: 1.0 | Last Updated: June 2026

---

## Complete Directory Tree

```
backend/
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Continuous Integration (lint, test, security scan)
│       ├── cd.yml                          # Continuous Deployment (build, deploy staging, deploy prod)
│       └── codeql.yml                      # CodeQL security analysis
│
├── docker/
│   ├── dev/
│   │   ├── Dockerfile                      # Dev Dockerfile with hot-reload, debugger, ffmpeg
│   │   └── init-db.sql                     # PostGIS extension init script
│   ├── staging/
│   │   └── Dockerfile                      # Staging Dockerfile (optimized, multi-stage)
│   └── prod/
│       └── nginx.conf                      # Production nginx reverse proxy config
│
├── prisma/
│   ├── migrations/                         # Auto-generated migration files
│   │   └── 20260601_000001_init_schema/
│   │       └── migration.sql               # Initial schema with all tables
│   ├── seeds/
│   │   ├── dev-seed.ts                     # Main seed runner (idempotent, upsert-based)
│   │   ├── data/
│   │   │   ├── users.json                  # Seed users for development
│   │   │   ├── profiles.json               # Seed criminal profiles
│   │   │   ├── cases.json                  # Seed investigation cases
│   │   │   ├── evidence.json               # Seed evidence records
│   │   │   ├── sightings.json              # Seed community sightings
│   │   │   └── alerts.json                 # Seed sample alerts
│   │   └── factories/
│   │       ├── user.factory.ts             # Dynamic user generator with faker
│   │       ├── case.factory.ts             # Dynamic case generator
│   │       └── evidence.factory.ts         # Dynamic evidence generator
│   └── schema.prisma                       # Complete database schema (12 models, 9 enums)
│
├── scripts/
│   ├── backup-db.sh                        # PostgreSQL backup to S3 script
│   ├── restore-db.sh                       # Database restore from backup
│   ├── seed.sh                             # Seed script wrapper with env checks
│   └── migrate.sh                          # Migration helper for CI/CD
│
├── src/
│   ├── config/
│   │   ├── env.ts                          # Environment variable loading & validation (Zod)
│   │   ├── database.ts                     # Prisma client singleton with connection pooling
│   │   ├── redis.ts                        # Redis client singleton (ioredis)
│   │   ├── session.ts                      # Session manager (create, get, touch, destroy)
│   │   └── logger.ts                       # Pino logger configuration
│   │
│   ├── middleware/
│   │   ├── auth.ts                         # Auth middleware: requireAuth, optionalAuth, requireRole, requirePermission
│   │   ├── validate.ts                     # Request validation: validateBody, validateQuery, validateParams
│   │   ├── upload.ts                       # File upload: evidenceUpload, photoUpload, batchUpload
│   │   ├── rate-limit.ts                   # Rate limiting: authRateLimit, apiRateLimit, uploadRateLimit
│   │   ├── error-handler.ts                # Global error handler (AppError, Zod, Prisma, Multer)
│   │   ├── security.ts                     # Security headers: helmet, CSP, HSTS, CORS
│   │   ├── logging.ts                      # Request logging middleware with correlation IDs
│   │   ├── database.ts                     # Database connection middleware (attach prisma to req)
│   │   ├── request-id.ts                   # X-Request-Id generation and propagation
│   │   ├── session-security.ts             # Session validation, IP tracking
│   │   └── audit.ts                        # Automatic audit log creation for mutating actions
│   │
│   ├── routes/
│   │   ├── index.ts                        # Route aggregator (mounts all route files under /api/v1)
│   │   ├── auth.routes.ts                  # POST /auth/register, login, refresh, logout, verify-email, etc.
│   │   ├── users.routes.ts                 # GET/PATCH /users, /me, /users/:id
│   │   ├── cases.routes.ts                 # CRUD /cases, suspect linking, evidence sub-resource
│   │   ├── evidence.routes.ts              # GET/POST/DELETE /cases/:id/evidence, chain of custody
│   │   ├── profiles.routes.ts              # CRUD /profiles, status changes, merge, photo upload
│   │   ├── sightings.routes.ts             # POST/GET /sightings, verify, nearby
│   │   ├── alerts.routes.ts                # CRUD /alerts, targeted sending, read/dismiss
│   │   ├── wanted.routes.ts                # GET /wanted (public feed), nearby, recent
│   │   ├── search.routes.ts                # GET /search (cross-entity full-text search)
│   │   ├── analytics.routes.ts             # GET /analytics/dashboard, reports
│   │   ├── notifications.routes.ts         # POST token registration, preferences
│   │   ├── audit.routes.ts                 # GET /audit logs, CSV export
│   │   ├── ai.routes.ts                    # POST /ai/analyze, identify, job status
│   │   ├── admin.routes.ts                 # GET /admin/stats, health, maintenance
│   │   └── health.routes.ts                # GET /health, /ready, /live
│   │
│   ├── controllers/
│   │   ├── base.controller.ts              # BaseController: ok(), created(), paginated(), noContent()
│   │   ├── auth/
│   │   │   └── auth.controller.ts          # register, login, refresh, logout, verify-email, 2fa
│   │   ├── users.controller.ts             # list, getById, update, delete, getMe, updateMe, preferences
│   │   ├── cases.controller.ts             # list, getById, create, update, archive, uploadEvidence
│   │   ├── evidence.controller.ts          # list, getById, download, verify, chainOfCustody
│   │   ├── profiles.controller.ts          # list, getById, create, update, status, merge, delete
│   │   ├── sightings.controller.ts         # submit, list, updateStatus, getNearby
│   │   ├── alerts.controller.ts            # list, create, markRead, dismiss, unreadCount
│   │   ├── wanted.controller.ts            # list, getById, recent, nearby
│   │   ├── search.controller.ts            # search across all entities
│   │   ├── analytics.controller.ts         # dashboard, reports, trends
│   │   ├── notifications.controller.ts     # registerToken, removeToken, preferences
│   │   ├── audit.controller.ts             # list, exportCSV
│   │   ├── ai.controller.ts                # analyze, identify, jobStatus
│   │   ├── admin.controller.ts             # stats, health, maintenance
│   │   └── health.controller.ts            # check, readiness, liveness
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   ├── auth.service.ts             # Registration, login, logout orchestration
│   │   │   ├── token.service.ts            # JWT generation, verification, rotation, revocation
│   │   │   ├── verification.service.ts     # Email verification token generation & validation
│   │   │   ├── password-reset.service.ts   # Password reset token flow with single-use enforcement
│   │   │   ├── two-factor.service.ts       # TOTP setup, verification, backup codes, encryption
│   │   │   └── brute-force.service.ts      # Login attempt tracking, lockout, rate limiting
│   │   ├── case.service.ts                 # Case CRUD, suspect linking, version tracking
│   │   ├── evidence.service.ts             # Evidence upload, chain of custody, integrity verification
│   │   ├── alert.service.ts                # Alert creation, recipient resolution, multi-channel delivery
│   │   ├── sighting.service.ts             # Sighting submit, verify, GPS proximity search
│   │   ├── profile.service.ts              # Profile CRUD, merge, status lifecycle, permanent delete
│   │   ├── audit.service.ts                # Immutable audit logging, query, CSV export
│   │   ├── ai-analysis.service.ts          # AI job submission, callback processing, detection events
│   │   ├── file-storage.service.ts         # S3 upload, thumbnail gen, pre-signed URLs, hash verification
│   │   ├── notification.service.ts         # Push (web/FCM/APNs), email, in-app delivery
│   │   ├── search.service.ts               # Elasticsearch with PostgreSQL fallback, indexing
│   │   ├── email.service.ts                # Template rendering, SMTP sending
│   │   └── analytics.service.ts            # Dashboard stats, time-series aggregation
│   │
│   ├── validators/
│   │   ├── auth.validator.ts               # Register, login, reset password, 2FA schemas
│   │   ├── user.validator.ts               # Update profile, preferences, role change schemas
│   │   ├── case.validator.ts               # Create, update, query, params schemas
│   │   ├── evidence.validator.ts           # Evidence metadata, status update schemas
│   │   ├── profile.validator.ts            # Create, update, status, query schemas
│   │   ├── sighting.validator.ts           # Submit, status update, nearby query schemas
│   │   ├── alert.validator.ts              # Create, targeted, query schemas
│   │   └── search.validator.ts             # Search query schema
│   │
│   ├── utils/
│   │   ├── async-handler.ts                # Async route wrapper (catch errors, forward to error middleware)
│   │   ├── pagination.ts                   # Pagination meta calculator (offset + cursor)
│   │   ├── serialize.ts                    # Response serializers (strip sensitive fields, format dates)
│   │   ├── deserialize.ts                  # Input parsers (JSONB from form data, date parsing)
│   │   ├── crypto.ts                       # SHA-256, AES encryption helpers for sensitive data
│   │   ├── url-signer.ts                   # Pre-signed URL generation for file downloads
│   │   └── helpers.ts                      # Misc: nanoid, file size format, enum validation
│   │
│   ├── types/
│   │   ├── models.ts                       # All interfaces: User, Case, Evidence, Profile, etc.
│   │   ├── requests.ts                     # Request types: PaginatedRequest, SearchRequest
│   │   ├── responses.ts                    # Response types: ApiResponse, HealthResponse, etc.
│   │   ├── enums.ts                        # All enum definitions re-exported with helpers
│   │   └── express.d.ts                    # Express Request augmentation (user, db, etc.)
│   │
│   ├── websocket/
│   │   ├── server.ts                       # WebSocket server setup, auth, heartbeat, channels
│   │   ├── handlers.ts                     # Message handlers: subscribe, unsubscribe, ping
│   │   └── channels.ts                     # Channel access control per role
│   │
│   ├── jobs/
│   │   ├── queue.ts                        # Bull queue definitions (email, push, ai, evidence, retention)
│   │   ├── email.processor.ts              # Nodemailer email sending worker
│   │   ├── push.processor.ts               # Push notification delivery worker
│   │   ├── evidence.processor.ts           # Thumbnail generation, video transcoding
│   │   ├── ai-analysis.processor.ts        # AI analysis job dispatch to Python service
│   │   ├── data-retention.job.ts           # Daily cron: archive old detections, expire tokens
│   │   └── search-index.processor.ts       # Elasticsearch indexing worker
│   │
│   ├── events/
│   │   ├── emitter.ts                      # Typed EventEmitter for internal events
│   │   ├── handlers.ts                     # Event handler registrations
│   │   └── listeners/
│   │       ├── case-events.listener.ts     # Handle case:created, case:updated, case:archived
│   │       ├── evidence-events.listener.ts # Handle evidence:uploaded -> trigger AI analysis
│   │       ├── profile-events.listener.ts  # Handle profile:created, profile:arrested
│   │       ├── sighting-events.listener.ts # Handle sighting:submitted, sighting:verified
│   │       └── alert-events.listener.ts    # Handle alert:created -> WebSocket broadcast
│   │
│   ├── integrations/
│   │   ├── s3.ts                           # S3 client (MinIO dev, AWS S3 prod)
│   │   ├── elasticsearch.ts                # Elasticsearch client
│   │   ├── ai-service.ts                   # Python AI microservice HTTP client
│   │   └── email.ts                        # Nodemailer transporter configuration
│   │
│   ├── errors/
│   │   ├── app-error.ts                    # Base AppError class
│   │   ├── auth-errors.ts                  # UnauthorizedError, ForbiddenError, TokenExpiredError
│   │   └── index.ts                        # Error code constants
│   │
│   ├── app.ts                              # Express app: middleware registration, route mounting
│   └── server.ts                           # HTTP + WebSocket server bootstrap, graceful shutdown
│
├── tests/
│   ├── setup.unit.ts                       # Global mocks for Prisma, Redis, external services
│   ├── setup.integration.ts                # Test DB migrations, app export, cleanup hooks
│   ├── global-setup.ts                     # Pre-test environment checks (DB, Redis connectivity)
│   ├── helpers/
│   │   ├── auth.ts                         # createTestUser(), generateTestToken(), createAuthenticatedRequest()
│   │   ├── db.ts                           # Test database helpers: truncateAll(), seedTestData()
│   │   └── factories.ts                    # Test data factory functions
│   ├── fixtures/
│   │   ├── test-image.jpg                  # Sample image for upload tests
│   │   ├── test-video.mp4                  # Sample video for upload tests
│   │   └── test-document.pdf               # Sample document for upload tests
│   ├── mocks/
│   │   ├── s3.ts                           # S3 client mock
│   │   ├── ai-service.ts                   # AI microservice HTTP mock (nock)
│   │   └── email.ts                        # Nodemailer transport mock
│   ├── unit/
│   │   ├── services/
│   │   │   ├── auth.service.test.ts        # AuthService unit tests
│   │   │   ├── token.service.test.ts       # TokenService unit tests
│   │   │   ├── case.service.test.ts        # CaseManagementService unit tests
│   │   │   ├── evidence.service.test.ts     # EvidenceService unit tests
│   │   │   ├── profile.service.test.ts      # ProfileService unit tests
│   │   │   ├── sighting.service.test.ts     # SightingService unit tests
│   │   │   ├── alert.service.test.ts        # AlertService unit tests
│   │   │   └── audit.service.test.ts        # AuditService unit tests
│   │   ├── middleware/
│   │   │   ├── auth.middleware.test.ts       # Auth middleware unit tests
│   │   │   ├── validate.middleware.test.ts   # Validation middleware unit tests
│   │   │   └── rate-limit.test.ts            # Rate limiter unit tests
│   │   ├── validators/
│   │   │   ├── auth.validator.test.ts        # Auth schema validation tests
│   │   │   ├── case.validator.test.ts        # Case schema validation tests
│   │   │   └── profile.validator.test.ts     # Profile schema validation tests
│   │   └── utils/
│   │       ├── serialize.test.ts             # Serialization function tests
│   │       ├── pagination.test.ts            # Pagination meta tests
│   │       └── crypto.test.ts                # Cryptographic function tests
│   ├── integration/
│   │   ├── auth.test.ts                      # Full auth flow integration tests
│   │   ├── cases.test.ts                     # Cases CRUD integration tests
│   │   ├── evidence.test.ts                  # Evidence upload & chain of custody tests
│   │   ├── profiles.test.ts                  # Profile CRUD & status change tests
│   │   ├── sightings.test.ts                 # Sighting submit & verify tests
│   │   ├── alerts.test.ts                    # Alert creation & delivery tests
│   │   ├── search.test.ts                    # Full-text search integration tests
│   │   ├── health.test.ts                    # Health endpoint tests
│   │   └── websocket.test.ts                 # WebSocket connection & message tests
│   └── e2e/
│       ├── auth-flow.test.ts                 # Complete registration -> login -> protected access
│       ├── case-workflow.test.ts             # Create case -> add evidence -> link suspect
│       └── sighting-workflow.test.ts         # Submit sighting -> verify -> notify
│
├── uploads/                                 # Local file storage (dev only — gitignored)
│   └── .gitkeep
│
├── .env.example                             # Environment variable template with all config
├── .eslintrc.cjs                             # ESLint: TypeScript strict mode, import ordering
├── .prettierrc                               # Prettier: single quotes, trailing commas, 100 width
├── .gitignore                                # node_modules, dist, .env, uploads, coverage
├── commitlint.config.cjs                     # Commit convention enforcement (conventional commits)
├── tsconfig.json                             # TypeScript: ES2022, strict, path aliases
├── vitest.config.ts                          # Unit test configuration
├── vitest.integration.config.ts              # Integration test configuration
├── docker-compose.yml                        # Dev: postgres+postgis, redis, minio, elasticsearch, api
├── docker-compose.staging.yml                # Staging: full stack with production-like config
├── docker-compose.prod.yml                   # Production: scaled services, secrets, nginx
├── Dockerfile                                # Multi-stage production build
├── package.json                              # Dependencies, scripts, lint-staged config
└── README.md                                 # Brief README (full docs in /docs/backend/)
```

---

## File Count Summary

| Directory | File Count | Purpose |
|-----------|-----------|---------|
| `.github/workflows/` | 3 | CI/CD pipelines |
| `docker/` | 4 | Dockerfiles & configs |
| `prisma/` | 11+ | Schema, migrations, seeds |
| `scripts/` | 4 | Utility scripts |
| `src/config/` | 5 | Environment, database, redis, session, logger |
| `src/middleware/` | 10 | Request processing middleware |
| `src/routes/` | 16 | Route definitions |
| `src/controllers/` | 16 | Request handlers |
| `src/services/` | 16 | Business logic |
| `src/validators/` | 8 | Zod validation schemas |
| `src/utils/` | 7 | Shared utilities |
| `src/types/` | 5 | TypeScript type definitions |
| `src/websocket/` | 3 | WebSocket server & handlers |
| `src/jobs/` | 8 | Background job processors |
| `src/events/` | 7 | Event system & listeners |
| `src/integrations/` | 4 | External service clients |
| `src/errors/` | 3 | Error classes |
| `src/` (root) | 2 | App & server entry points |
| `tests/` | 30+ | Unit, integration, E2E tests |
| **Total** | **~160+ files** | Complete production backend |

---

## Entry Point Flow

```
server.ts
  └── imports app.ts
        └── registers middleware (security, cors, compression, body parsing, etc.)
        └── mounts routes under /api/v1
              ├── auth.routes.ts
              ├── users.routes.ts
              ├── cases.routes.ts
              ├── ... (13 more route files)
              └── health.routes.ts
        └── attaches error handler (last middleware)
        └── exports app
  └── creates HTTP server
  └── attaches WebSocket server (AlertWebSocketServer)
  └── starts listening on PORT
  └── registers graceful shutdown handlers
```

---

## Key Architectural Decisions Reflected in File Structure

| Decision | How It's Encoded |
|----------|-----------------|
| **Domain-driven routes** | Routes organized by business entity (cases, evidence, profiles), not by HTTP method |
| **Thin controllers, fat services** | Controllers are minimal (validate -> call service -> respond); all logic in services/ |
| **Cross-cutting concerns via middleware** | Auth, validation, audit, rate limiting all implemented as Express middleware |
| **Event-driven integration** | Internal events decouple services (case:created triggers search indexing + notifications) |
| **Background jobs for async work** | Bull queue processors handle email, push, AI analysis, data retention |
| **Immutable audit trail** | AuditService is a dedicated service with its own model; never bypassed |
| **Pluggable storage** | FileStorageService abstracts S3/MinIO behind a unified interface |
| **Polyglot AI integration** | AIService communicates with Python microservice via Redis queue + HTTP callbacks |
| **Versioned API** | All routes under `/api/v1/` for future backward-compatible changes |
| **Role-based file organization** | `controllers/`, `services/`, `validators/` mirror the same domain structure |
