# 00 — Project Setup

> **Sentinel360 Backend — Project Initialization**
> Version: 1.0 | Last Updated: June 2026

---

## Table of Contents

1. [Technology Stack Justification](#1-technology-stack-justification)
2. [Architecture Decision Record](#2-architecture-decision-record)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Dependencies & Rationale](#4-dependencies--rationale)
5. [Environment Variables Template](#5-environment-variables-template)
6. [Docker Setup](#6-docker-setup)
7. [Code Quality Configuration](#7-code-quality-configuration)
8. [Git Hooks](#8-git-hooks)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Getting Started](#10-getting-started)

---

## 1. Technology Stack Justification

### Primary Backend: Node.js + TypeScript + Express

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Runtime** | Node.js 20 LTS | Non-blocking I/O ideal for video/file streaming, WebSocket connections, and concurrent request handling. Largest ecosystem for real-time applications. |
| **Language** | TypeScript 5.x | Static typing prevents entire classes of bugs. Essential for a safety-critical system handling forensic evidence. Provides self-documenting code through interfaces and types. |
| **Framework** | Express 4.x | Most mature Node.js framework. Vast middleware ecosystem. Well-understood by the team. Can be wrapped with structured patterns for production-grade code. |
| **API Layer** | Express Router | Domain-based route organization with middleware chains. |
| **Real-Time** | WebSocket (ws) + Redis Pub/Sub | For live alert delivery to security operators and law enforcement. Redis Pub/Sub allows horizontal scaling across multiple API instances. |
| **ORM** | Prisma 5.x | Type-safe database access with auto-generated types. Built-in migration system. Best-in-class developer experience for TypeScript projects. |
| **Validation** | Zod 3.x | TypeScript-first schema validation. Infers types from schemas. Composable and performant. |
| **Auth** | JWT (jsonwebtoken) + bcrypt | Stateless authentication suitable for distributed systems. Refresh token rotation for security. |
| **File Upload** | Multer + Sharp + FFmpeg | Multer for multipart handling, Sharp for image processing (resizing, thumbnails), FFmpeg for video transcoding and thumbnail extraction. |
| **Background Jobs** | Bull + Redis | For processing AI analysis tasks, video transcoding, and notification delivery without blocking the API. |
| **Caching** | Redis 7 | Session store, rate limiting, frequent query caching, real-time pub/sub. |
| **Search** | Elasticsearch 8 | Full-text search on wanted feed, case evidence, and criminal profiles. Geospatial queries for location-based searching. |
| **Storage** | MinIO (dev) / S3 (prod) | S3-compatible object storage for evidence files (images, video clips, documents). Immutable with versioning enabled. |

### AI/ML Microservice: Python + FastAPI

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Runtime** | Python 3.12 | Native ecosystem for ML/AI (PyTorch, TensorFlow, OpenCV). |
| **Framework** | FastAPI | Automatic OpenAPI docs, async support, Pydantic validation. Perfect for ML model serving. |
| **ML Stack** | PyTorch + OpenCV + YOLOv8 | Object detection, facial recognition, ALPR, behaviour analysis. |
| **Communication** | Redis Queue + REST | API gateway pushes analysis tasks to Redis queue; Python workers consume and process. Results written back to PostgreSQL. |

### Database: PostgreSQL 16 + PostGIS + TimescaleDB

| Extension | Purpose |
|-----------|---------|
| **PostGIS** | Geospatial queries for crime locations, camera positions, movement paths. |
| **TimescaleDB** | Time-series optimization for alert history, detection events, entity movement logs. |
| **pgcrypto** | Cryptographic hashing for chain of custody (SHA-256). |
| **uuid-ossp** | UUID v4 generation for all entity IDs. |

### Why Not Alternatives?

| Alternative | Reason Against |
|-------------|---------------|
| **Python + Django** | Heavier, less suitable for real-time WebSocket at scale. Django ORM migrations are less elegant than Prisma. |
| **Go + Gin** | Strong performance but smaller ecosystem for the integrations we need. Team has stronger Node.js expertise. |
| **GraphQL (Apollo)** | Overkill for this domain. REST is simpler for file uploads, clearer for caching, and more natural for the search/filter heavy workload. |
| **MySQL** | Inferior JSON support, no PostGIS equivalent, weaker for geospatial queries needed for camera/sighting locations. |
| **MongoDB** | Sacrifices relational integrity — we need strict schemas for evidence chain of custody. No migrations. |
| **NestJS** | Opinionated framework that adds abstraction overhead. Express + structured patterns gives more control without the magic. |

---

## 2. Architecture Decision Record

### ADR-001: Polyglot Backend with Node.js API + Python AI Service
**Status**: Accepted  
**Context**: The system needs both high-I/O throughput (video upload, WebSocket, REST) and ML inference.  
**Decision**: Use Node.js for the API gateway and real-time layer. Python microservice for AI processing.  
**Consequence**: Slightly more complex deployment (two services) but each service optimized for its domain.

### ADR-002: PostgreSQL over Document Store
**Status**: Accepted  
**Context**: Evidence integrity, chain of custody, and complex relational queries (criminal -> cases -> evidence -> alerts).  
**Decision**: PostgreSQL with strict schemas, foreign keys, and migrations.  
**Consequence**: Schema changes require migrations but ensure data integrity.

### ADR-003: JWT Stateless Auth with Refresh Rotation
**Status**: Accepted  
**Context**: Multiple client types (web dashboard, mobile app) need authentication.  
**Decision**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days) with rotation.  
**Consequence**: Better security (limited window for compromised tokens) but requires refresh logic on clients.

### ADR-004: S3-Compatible Object Storage
**Status**: Accepted  
**Context**: Evidence files range from small images to large video clips. Must be immutable with versioning.  
**Decision**: MinIO for development, AWS S3 for production. Pre-signed URLs for secure access.  
**Consequence**: Storage is decoupled from compute, allowing independent scaling.

---

## 3. Project Folder Structure

```
backend/
├── src/
│   ├── config/              # Configuration loaders & env validation
│   ├── middleware/           # Express middleware functions
│   ├── routes/              # Route definitions (domain-organized)
│   ├── controllers/         # Request handlers (thin layer)
│   ├── services/            # Business logic layer
│   ├── models/              # Prisma models (generated types re-exports)
│   ├── validators/          # Zod schemas for request/response validation
│   ├── utils/               # Shared utilities (encryption, pagination, etc.)
│   ├── types/               # TypeScript type definitions & interfaces
│   ├── websocket/           # WebSocket handler setup & rooms
│   ├── jobs/                # Bull queue job processors
│   ├── events/              # Event emitter definitions & handlers
│   ├── integrations/        # External service clients (AI, S3, Elasticsearch)
│   ├── errors/              # Custom error classes & error codes
│   ├── app.ts               # Express app setup (middleware registration)
│   └── server.ts            # Entry point (HTTP + WebSocket server bootstrap)
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests (API routes)
│   ├── e2e/                 # End-to-end tests
│   ├── fixtures/            # Test data & mock factories
│   ├── helpers/             # Test utilities (auth helper, db helper)
│   └── setup.ts             # Global test setup (beforeAll, afterAll)
├── prisma/
│   ├── schema.prisma        # Database schema definition
│   ├── migrations/          # Auto-generated migration files
│   └── seeds/               # Seed data for development
├── scripts/                 # Utility scripts (db reset, seed, etc.)
├── docker/                  # Docker configurations
│   ├── dev/                 # Development Dockerfile & compose override
│   ├── staging/             # Staging configuration
│   └── prod/                # Production multi-stage Dockerfile
├── uploads/                 # Local file storage (dev only — gitignored)
├── .github/
│   └── workflows/           # GitHub Actions CI/CD pipelines
├── docs/                    # Backend documentation
├── .env.example             # Environment variables template
├── .eslintrc.cjs            # ESLint configuration
├── .prettierrc              # Prettier configuration
├── commitlint.config.cjs    # Commitlint configuration
├── tsconfig.json            # TypeScript configuration
├── vitest.config.ts         # Vitest configuration
├── docker-compose.yml       # Main Docker Compose (dev)
├── docker-compose.staging.yml
├── docker-compose.prod.yml
├── package.json
├── Dockerfile               # Root Dockerfile (multi-stage)
└── README.md                # (Brief — docs are in /docs)
```

---

## 4. Dependencies & Rationale

### `package.json` — Production Dependencies

```json
{
  "name": "sentinel360-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0",
    "express": "^4.19.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.2.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.0",
    "uuid": "^9.0.1",
    "ws": "^8.17.0",
    "ioredis": "^5.4.0",
    "bull": "^4.12.0",
    "@elastic/elasticsearch": "^8.13.0",
    "@aws-sdk/client-s3": "^3.554.0",
    "@aws-sdk/s3-request-presigner": "^3.554.0",
    "nodemailer": "^6.9.13",
    "handlebars": "^4.7.8",
    "pino": "^9.1.0",
    "pino-pretty": "^11.1.0",
    "dotenv": "^16.4.5",
    "dayjs": "^1.11.11",
    "nanoid": "^5.0.7",
    "cookie-parser": "^1.4.6",
    "csrf-csrf": "^3.0.6"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.0",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/bcryptjs": "^2.4.6",
    "@types/multer": "^1.4.11",
    "@types/ws": "^8.5.10",
    "@types/cookie-parser": "^1.4.7",
    "@types/nodemailer": "^6.4.15",
    "prisma": "^5.14.0",
    "vitest": "^1.6.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.8.0",
    "@typescript-eslint/parser": "^7.8.0",
    "prettier": "^3.2.5",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.29.1",
    "husky": "^9.0.11",
    "lint-staged": "^15.2.2",
    "commitlint": "^19.3.0",
    "@commitlint/config-conventional": "^19.2.2",
    "tsx": "^4.10.0",
    "mock-fs": "^5.2.0",
    "nock": "^13.5.0",
    "faker": "^6.6.6"
  }
}
```

### Dependency Rationale Table

| Dependency | Category | Why |
|-----------|----------|-----|
| `@prisma/client` + `prisma` | Database | Type-safe ORM with auto-generated types and migration system. |
| `express` | Framework | HTTP server with middleware ecosystem. |
| `helmet` | Security | Sets secure HTTP headers (X-Frame-Options, CSP, etc.). |
| `compression` | Performance | Gzip/brotli compression for API responses. |
| `express-rate-limit` | Security | Rate limiting per IP/user to prevent abuse. |
| `jsonwebtoken` | Auth | JWT signing and verification for stateless auth. |
| `bcryptjs` | Auth | Password hashing with configurable salt rounds. |
| `zod` | Validation | Runtime validation with TypeScript type inference. |
| `multer` | File Upload | Multipart form data parsing for file uploads. |
| `sharp` | Image Processing | High-performance image resizing, thumbnail generation. |
| `ws` | Real-Time | WebSocket server for real-time alerts. |
| `ioredis` | Cache/Queue | Redis client with cluster support, Pub/Sub, and Bull integration. |
| `bull` | Job Queue | Redis-backed job queue for async processing (AI analysis, notifications). |
| `@elastic/elasticsearch` | Search | Full-text and geospatial search client. |
| `@aws-sdk/client-s3` | Storage | S3-compatible storage for evidence files. |
| `nodemailer` | Email | Email delivery for verification, password reset, notifications. |
| `handlebars` | Templates | Email template rendering. |
| `pino` | Logging | High-performance structured JSON logger. |
| `dotenv` | Config | Environment variable loading from `.env` files. |
| `dayjs` | Dates | Lightweight date manipulation (alternative to moment). |
| `nanoid` | IDs | URL-safe unique ID generation for short codes (sighting refs, etc.). |
| `cookie-parser` | Cookies | Parse cookies for refresh token handling. |
| `vitest` | Testing | Fast test runner with native TypeScript support. |
| `supertest` | Testing | HTTP integration testing for Express routes. |
| `tsx` | Dev | TypeScript execution for development scripts. |
| `nock` | Testing | HTTP mocking for external service tests. |

---

## 5. Environment Variables Template

```bash
# ============================================================================
# Sentinel360 Backend — Environment Variables
# ============================================================================
# Copy this file to .env and fill in your values.
# NEVER commit .env to version control.

# --- Application ---
NODE_ENV=development
PORT=4000
API_PREFIX=/api/v1
APP_NAME=Sentinel360
APP_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug

# --- Database (PostgreSQL) ---
DATABASE_URL=postgresql://sentinel:supersecret@localhost:5432/sentinel360?schema=public
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_TIMEOUT=30000

# --- Redis ---
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_PREFIX=sentinel360:

# --- JWT ---
JWT_ACCESS_SECRET=your-access-secret-minimum-32-chars-long
JWT_REFRESH_SECRET=your-refresh-secret-minimum-32-chars-long
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_ISSUER=sentinel360

# --- Bcrypt ---
BCRYPT_SALT_ROUNDS=12

# --- Email (Nodemailer) ---
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@sentinel360.gov
EMAIL_FROM_NAME=Sentinel360

# --- File Storage (S3-compatible) ---
STORAGE_PROVIDER=minio
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_EVIDENCE=sentinel360-evidence
S3_BUCKET_AVATARS=sentinel360-avatars
S3_BUCKET_EXPORTS=sentinel360-exports
S3_FORCE_PATH_STYLE=true
MAX_FILE_SIZE_MB=500

# --- Elasticsearch ---
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_API_KEY=
ELASTICSEARCH_INDEX_PREFIX=sentinel360

# --- AI Service ---
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your-ai-service-key
AI_CONFIDENCE_THRESHOLD=0.80
AI_ANALYSIS_TIMEOUT=120000

# --- Rate Limiting ---
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=20

# --- WebSocket ---
WS_HEARTBEAT_INTERVAL=30000
WS_HEARTBEAT_TIMEOUT=10000

# --- CORS ---
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# --- 2FA (Super Admin) ---
OTP_ISSUER=Sentinel360
OTP_ENCRYPTION_KEY=your-otp-encryption-key-32-chars-long

# --- Session ---
SESSION_EXPIRY_HOURS=24

# --- Audit ---
AUDIT_LOG_RETENTION_DAYS=365

# --- Feature Flags ---
FEATURE_AI_ANALYSIS_ENABLED=true
FEATURE_PUBLIC_FEED_ENABLED=true
FEATURE_COMMUNITY_SIGHTINGS_ENABLED=true
```

---

## 6. Docker Setup

### 6.1 Main `docker-compose.yml` (Development)

```yaml
version: "3.9"

name: sentinel360-dev

services:
  postgres:
    image: postgis/postgis:16-3.4
    container_name: sentinel360-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: sentinel
      POSTGRES_PASSWORD: supersecret
      POSTGRES_DB: sentinel360
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/dev/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sentinel -d sentinel360"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - sentinel360-net

  redis:
    image: redis:7-alpine
    container_name: sentinel360-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ""
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - sentinel360-net

  minio:
    image: minio/minio:latest
    container_name: sentinel360-minio
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - sentinel360-net

  elasticsearch:
    image: elasticsearch:8.13.0
    container_name: sentinel360-elasticsearch
    restart: unless-stopped
    ports:
      - "9200:9200"
    environment:
      discovery.type: single-node
      xpack.security.enabled: false
      ES_JAVA_OPTS: "-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - sentinel360-net

  api:
    build:
      context: .
      dockerfile: docker/dev/Dockerfile
    container_name: sentinel360-api
    restart: unless-stopped
    ports:
      - "4000:4000"
      - "9229:9229" # Debug port
    volumes:
      - .:/app
      - /app/node_modules
      - /app/dist
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    command: >
      sh -c "
        npx prisma generate &&
        npx prisma migrate deploy &&
        npm run dev
      "
    networks:
      - sentinel360-net

  ai-service:
    image: sentinel360-ai:latest
    build:
      context: ./ai-service
      dockerfile: Dockerfile.dev
    container_name: sentinel360-ai
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - ./ai-service:/app
    env_file:
      - .env
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - sentinel360-net

networks:
  sentinel360-net:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  minio_data:
  elasticsearch_data:
```

### 6.2 Dev Dockerfile (`docker/dev/Dockerfile`)

```dockerfile
FROM node:20-alpine

RUN apk add --no-cache \
    ffmpeg \
    curl \
    bash \
    python3 \
    make \
    g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=development

COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 4000 9229

CMD ["npm", "run", "dev"]
```

### 6.3 Production Dockerfile (`Dockerfile` — Multi-stage)

```dockerfile
# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=development

COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

RUN apk add --no-cache ffmpeg curl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN npx prisma generate

RUN chown -R appuser:nodejs /app

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
```

### 6.4 Staging Compose (`docker-compose.staging.yml`)

```yaml
version: "3.9"

name: sentinel360-staging

services:
  postgres:
    image: postgis/postgis:16-3.4
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: sentinel360_staging
    volumes:
      - pg_staging_data:/var/lib/postgresql/data
    networks:
      - staging-net

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_staging_data:/data
    networks:
      - staging-net

  minio:
    image: minio/minio:latest
    restart: always
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
    volumes:
      - minio_staging_data:/data
    command: server /data
    networks:
      - staging-net

  elasticsearch:
    image: elasticsearch:8.13.0
    restart: always
    environment:
      discovery.type: single-node
      ES_JAVA_OPTS: "-Xms1g -Xmx1g"
    volumes:
      - es_staging_data:/usr/share/elasticsearch/data
    networks:
      - staging-net

  api:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "4000:4000"
    env_file:
      - .env.staging
    depends_on:
      - postgres
      - redis
      - minio
      - elasticsearch
    networks:
      - staging-net

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8000:8000"
    env_file:
      - .env.staging
    depends_on:
      - redis
    networks:
      - staging-net

networks:
  staging-net:
    driver: bridge

volumes:
  pg_staging_data:
  redis_staging_data:
  minio_staging_data:
  es_staging_data:
```

### 6.5 Production Compose (`docker-compose.prod.yml`)

```yaml
version: "3.9"

name: sentinel360-prod

services:
  api:
    image: ${DOCKER_REGISTRY}/sentinel360-api:${IMAGE_TAG}
    restart: always
    ports:
      - "4000:4000"
    env_file:
      - .env.production
    secrets:
      - jwt_access_secret
      - jwt_refresh_secret
      - db_password
    depends_on:
      - postgres
      - redis
    logging:
      driver: "awslogs"
      options:
        awslogs-group: "sentinel360-prod-api"
        awslogs-region: "us-east-1"
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: any
    networks:
      - prod-net

  postgres:
    image: postgis/postgis:16-3.4
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_DB: sentinel360
    volumes:
      - pg_prod_data:/var/lib/postgresql/data
    secrets:
      - db_password
    networks:
      - prod-net

  redis:
    image: redis:7-alpine
    restart: always
    command: >
      redis-server --appendonly yes
      --requirepass ${REDIS_PASSWORD}
      --tls-port 6379 --port 0
      --tls-cert-file /run/secrets/redis-cert
      --tls-key-file /run/secrets/redis-key
    secrets:
      - redis_cert
      - redis_key
    volumes:
      - redis_prod_data:/data
    networks:
      - prod-net

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/sites:/etc/nginx/sites:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - api
    networks:
      - prod-net

secrets:
  jwt_access_secret:
    external: true
  jwt_refresh_secret:
    external: true
  db_password:
    external: true
  redis_cert:
    external: true
  redis_key:
    external: true

networks:
  prod-net:
    driver: overlay

volumes:
  pg_prod_data:
    driver: cloudstor:aws
  redis_prod_data:
```

---

## 7. Code Quality Configuration

### 7.1 TypeScript Config (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "useUnknownInCatchVariables": true,
    "paths": {
      "@/*": ["./src/*"],
      "@config/*": ["./src/config/*"],
      "@middleware/*": ["./src/middleware/*"],
      "@routes/*": ["./src/routes/*"],
      "@controllers/*": ["./src/controllers/*"],
      "@services/*": ["./src/services/*"],
      "@validators/*": ["./src/validators/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"],
      "@websocket/*": ["./src/websocket/*"],
      "@jobs/*": ["./src/jobs/*"],
      "@events/*": ["./src/events/*"],
      "@integrations/*": ["./src/integrations/*"],
      "@errors/*": ["./src/errors/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 7.2 ESLint Config (`.eslintrc.cjs`)

```javascript
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/strict",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json",
      },
    },
  },
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-process-env": "warn",
    eqeqeq: ["error", "always"],
    curly: ["error", "all"],
    "prefer-const": "error",
    "no-var": "error",
  },
  ignorePatterns: ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"],
};
```

### 7.3 Prettier Config (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "embeddedLanguageFormatting": "auto"
}
```

### 7.4 Vitest Config (`vitest.config.ts`)

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: ".",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/server.ts",
        "src/types/**",
        "src/errors/index.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 15000,
    hookTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@config": path.resolve(__dirname, "./src/config"),
        "@middleware": path.resolve(__dirname, "./src/middleware"),
        "@routes": path.resolve(__dirname, "./src/routes"),
        "@controllers": path.resolve(__dirname, "./src/controllers"),
        "@services": path.resolve(__dirname, "./src/services"),
        "@validators": path.resolve(__dirname, "./src/validators"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@types": path.resolve(__dirname, "./src/types"),
        "@websocket": path.resolve(__dirname, "./src/websocket"),
        "@jobs": path.resolve(__dirname, "./src/jobs"),
        "@events": path.resolve(__dirname, "./src/events"),
        "@integrations": path.resolve(__dirname, "./src/integrations"),
        "@errors": path.resolve(__dirname, "./src/errors"),
      },
    },
  },
});
```

---

## 8. Git Hooks

### 8.1 Husky Setup

```bash
# Install husky
npx husky init

# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged

# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"

# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

npm run type-check && npm run test:related
```

### 8.2 lint-staged Config (in `package.json`)

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.json": [
      "prettier --write"
    ],
    "*.yml": [
      "prettier --write"
    ]
  }
}
```

### 8.3 Commitlint Config (`commitlint.config.cjs`)

```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",     // New feature
        "fix",      // Bug fix
        "docs",     // Documentation
        "style",    // Formatting
        "refactor", // Code restructuring
        "perf",     // Performance
        "test",     // Tests
        "chore",    // Maintenance
        "ci",       // CI/CD
        "build",    // Build system
        "revert",   // Revert commit
        "security", // Security fix
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "api", "auth", "ws", "db", "config", "deps",
        "ci", "docs", "test", "docker", "models",
        "middleware", "services", "controllers",
        "ai", "storage", "search", "alerts",
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "body-max-line-length": [2, "always", 100],
  },
};
```

### 8.4 Commit Message Convention

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

**Examples:**
```
feat(auth): implement jwt refresh token rotation
fix(db): resolve migration conflict on criminal_profiles
perf(api): add database query indexing for wanted feed
security(auth): add rate limiting on login endpoint
docs(api): document evidence upload endpoint
```

---

## 9. CI/CD Pipeline

### `.github/workflows/ci.yml` — Continuous Integration

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"
  DATABASE_URL: "postgresql://sentinel:test@localhost:5432/sentinel360_test"
  REDIS_URL: "redis://localhost:6379"

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Prisma generate
        run: npx prisma generate

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: ESLint
        run: npx eslint src/ --ext .ts --max-warnings 0

      - name: Prettier check
        run: npx prettier --check "src/**/*.ts"

  unit-tests:
    name: Unit Tests
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npx vitest run --reporter=verbose
        env:
          NODE_ENV: test

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  integration-tests:
    name: Integration Tests
    needs: unit-tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_USER: sentinel
          POSTGRES_PASSWORD: test
          POSTGRES_DB: sentinel360_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ env.DATABASE_URL }}

      - name: Run integration tests
        run: npx vitest run --config vitest.integration.config.ts
        env:
          NODE_ENV: test
          DATABASE_URL: ${{ env.DATABASE_URL }}
          REDIS_URL: ${{ env.REDIS_URL }}

  security-scan:
    name: Security Scan
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run npm audit
        run: npm audit --audit-level=high

  docker-build:
    name: Docker Build
    needs: [integration-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: sentinel360-api:ci-${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### `.github/workflows/cd.yml` — Continuous Deployment

```yaml
name: CD

on:
  push:
    branches: [main]

env:
  DOCKER_REGISTRY: ghcr.io
  IMAGE_NAME: sentinel360-api

jobs:
  build-and-push:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.DOCKER_REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set image tag
        id: meta
        run: |
          echo "tag=${{ env.DOCKER_REGISTRY }}/${{ github.repository }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" >> $GITHUB_OUTPUT
          echo "tag_latest=${{ env.DOCKER_REGISTRY }}/${{ github.repository }}/${{ env.IMAGE_NAME }}:latest" >> $GITHUB_OUTPUT

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ steps.meta.outputs.tag }}
            ${{ steps.meta.outputs.tag_latest }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    needs: build-and-push
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging-api.sentinel360.gov

    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/sentinel360
            docker-compose -f docker-compose.staging.yml pull
            docker-compose -f docker-compose.staging.yml up -d --force-recreate
            docker system prune -f

      - name: Run smoke tests
        run: |
          sleep 30
          curl -f --retry 5 --retry-delay 10 https://staging-api.sentinel360.gov/api/v1/health

  deploy-production:
    name: Deploy to Production
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.sentinel360.gov

    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            docker service update --image ${{ env.DOCKER_REGISTRY }}/${{ github.repository }}/${{ env.IMAGE_NAME }}:${{ github.sha }} sentinel360_api

      - name: Health check
        run: |
          for i in $(seq 1 12); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.sentinel360.gov/api/v1/health)
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed!"
              exit 0
            fi
            echo "Attempt $i: waiting... (status $STATUS)"
            sleep 10
          done
          echo "Health check failed after 12 attempts"
          exit 1

  notify:
    name: Notify Team
    needs: [deploy-production]
    runs-on: ubuntu-latest
    steps:
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "🚀 Sentinel360 backend deployed to production\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}\nDeploy URL: https://api.sentinel360.gov"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 10. Getting Started

### Prerequisites
- Node.js 20+
- Docker Desktop 4.x
- Git 2.40+

### Quick Start (Development)

```bash
# 1. Clone and navigate
git clone <repo-url>
cd backend

# 2. Copy environment template
cp .env.example .env

# 3. Start infrastructure (PostgreSQL, Redis, MinIO, Elasticsearch)
docker compose up -d postgres redis minio elasticsearch

# 4. Install dependencies
npm ci

# 5. Generate Prisma client & run migrations
npx prisma generate
npx prisma migrate dev

# 6. Seed development data
npm run seed

# 7. Start development server
npm run dev
```

### Package Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src/ --ext .ts",
    "lint:fix": "eslint src/ --ext .ts --fix",
    "format": "prettier --write 'src/**/*.ts'",
    "format:check": "prettier --check 'src/**/*.ts'",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "test:coverage": "vitest run --coverage",
    "seed": "tsx prisma/seeds/dev-seed.ts",
    "db:reset": "npx prisma migrate reset --force",
    "db:migrate": "npx prisma migrate dev",
    "db:studio": "npx prisma studio",
    "docker:dev": "docker compose up -d",
    "docker:build": "docker compose build",
    "docker:down": "docker compose down",
    "prepare": "husky",
    "commit": "cz"
  }
}
```

---

## Summary

This document establishes the complete foundation for the Sentinel360 backend:

- **Node.js + TypeScript + Express** as the primary API framework for its real-time capabilities and mature ecosystem
- **Polyglot architecture** with a Python AI/ML microservice for inference workloads
- **PostgreSQL with PostGIS** for relational integrity and geospatial queries
- **Prisma ORM** for type-safe database access and migrations
- **Redis** for caching, queues, and real-time pub/sub
- **MinIO/S3** for evidence storage with versioning
- **Elasticsearch** for full-text search across cases and profiles
- **Comprehensive Docker setup** for dev, staging, and production
- **Full CI/CD pipeline** with linting, testing, security scanning, and automated deployment
- **Code quality tools** (ESLint, Prettier, Husky, Commitlint) enforcing standards
