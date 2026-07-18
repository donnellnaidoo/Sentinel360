# Sentinel360 — Deployment Guide

> **Document:** 01-deployment-guide.md  
> **Version:** 1.0  
> **Status:** Draft  
> **Last Updated:** June 2026  
> **Category:** Infrastructure & Automation

---

## Table of Contents

1. [Deployment Architecture Overview](#deployment-architecture-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Environment Strategy](#environment-strategy)
4. [Docker Containerization Strategy](#docker-containerization-strategy)
5. [CI/CD Pipeline Design](#cicd-pipeline-design)
6. [Environment Variables Management](#environment-variables-management)
7. [Database Migrations in Production](#database-migrations-in-production)
8. [Monitoring & Observability](#monitoring--observability)
9. [Secrets Management](#secrets-management)
10. [Runbooks](#runbooks)

---

## Deployment Architecture Overview

### Modular Monolith on Kubernetes

Sentinel360 is deployed as a **modular monolith** — a single deployable NestJS/Hono backend application with strictly separated domain modules — running on a Kubernetes cluster (EKS or GKE). This architecture was chosen to maximise development velocity for a team of 6 developers while preserving a clean extraction path to microservices when scaling demands it.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Internet / CDN (CloudFront)                       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                         ┌───────▼────────┐
                         │  Load Balancer  │
                         │  (Kong/ALB)     │
                         └───────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼───────┐  ┌──────▼───────┐  ┌───────▼────────┐
     │  api-gateway    │  │  backend-app  │  │ websocket-server│
     │  (Kong)         │  │  (modular     │  │ (Socket.IO)     │
     │  Replicas: 2-5  │  │   monolith)   │  │ Replicas: 2-4   │
     │  HPA: CPU 70%   │  │  Replicas: 2-6│  │ HPA: CPU 70%    │
     └─────────────────┘  │  HPA: CPU 75% │  └─────────────────┘
                          │  + req/sec    │
                          └───────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
           ┌────────▼───┐  ┌─────▼──────┐  ┌───▼────────┐
           │ Supabase    │  │  Redis     │  │  Kafka     │
           │ PostgreSQL  │  │  (Elasti-  │  │  (MSK)     │
           │ (Multi-AZ)  │  │  Cache)    │  │  3 brokers │
           └─────────────┘  └────────────┘  └────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Deployment unit** | Single Docker image (modular monolith) | Faster iteration, simpler debugging, ACID within single DB |
| **Orchestration** | Kubernetes (EKS/GKE) | Industry standard, auto-scaling, self-healing |
| **API Gateway** | Kong | Plugin ecosystem, rate limiting, auth |
| **Service mesh** | Not yet (future: Istio) | Overhead not justified at current scale |
| **DNS strategy** | `api.sentinel360.io`, `ws.sentinel360.io` | Clear separation of concerns |

### When to Extract to Microservices

Extraction happens when **at least one** condition is met:
1. **Independent scaling** — AI Orchestrator needs GPU scaling independently
2. **Team autonomy** — Teams split into >2 squads owning distinct domains
3. **Technology divergence** — A domain needs a different runtime or database

---

## Monorepo Structure

### Turborepo Layout

```
Sentinel360/
├── apps/
│   ├── server/          # NestJS/Hono backend (modular monolith)
│   ├── web/             # Next.js web application (port 3001)
│   └── native/          # React Native / Expo mobile app
├── packages/
│   ├── api/             # tRPC router definitions & shared types
│   ├── auth/            # Authentication logic (Better Auth)
│   ├── config/          # Shared TypeScript configs (tsconfig, eslint)
│   ├── db/              # Drizzle ORM schema, migrations, client
│   ├── env/             # Environment variable validation (Zod)
│   └── ui/              # Shared UI components (React)
├── turbo.json           # Turborepo pipeline configuration
└── package.json         # Root workspace config (Bun workspace)
```

### App Responsibilities

| App | Framework | Port | Purpose |
|-----|-----------|------|---------|
| **server** | Hono + tRPC | 3000 | Modular monolith backend, API routes, WebSocket, background workers |
| **web** | Next.js 16 | 3001 | Web dashboard for law enforcement, case management, evidence review |
| **native** | Expo / React Native | — | Mobile app for field agents, camera monitoring, alert response |

### Turborepo Pipeline (`turbo.json`)

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "inputs": ["src/**", "tsconfig.json"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "check-types": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "db:generate": {
      "dependsOn": [],
      "cache": false
    },
    "db:migrate": {
      "dependsOn": ["db:generate"],
      "cache": false
    }
  }
}
```

---

## Environment Strategy

### Environment Tiers

```
┌──────────────────────────────────────────────────────────────────┐
│                        Environment Flow                          │
│                                                                  │
│   Developer Machine                                              │
│   ┌──────────────────┐                                           │
│   │  Local Dev       │  bun run dev:server / dev:web / dev:native│
│   │  .env.local      │  Supabase local (db:push)                  │
│   └────────┬─────────┘                                           │
│            │ PR merged                                            │
│            ▼                                                     │
│   ┌──────────────────┐                                           │
│   │  Development     │  Auto-deployed from main branch           │
│   │  .env.dev        │  Shared Supabase dev project              │
│   │  K8s: dev        │  Single replica, no autoscaling           │
│   └────────┬─────────┘                                           │
│            │ Release branch                                      │
│            ▼                                                     │
│   ┌──────────────────┐                                           │
│   │  Staging         │  Auto-deployed from release/* branch      │
│   │  .env.staging     │  Isolated Supabase project               │
│   │  K8s: staging    │  2 pods, full test suite                  │
│   └────────┬─────────┘                                           │
│            │ Manual approval                                     │
│            ▼                                                     │
│   ┌──────────────────┐                                           │
│   │  Production      │  Manual promote from staging              │
│   │  .env.production │  Full Supabase (Multi-AZ, read replicas)  │
│   │  K8s: prod       │  Full autoscaling, blue-green deploy      │
│   └──────────────────┘                                           │
└──────────────────────────────────────────────────────────────────┘
```

### Environment Details

| Environment | Auto-deploy | Database | Replicas | Scaling | Purpose |
|-------------|-------------|----------|----------|---------|---------|
| **Development** | Every `main` merge | Shared Supabase dev | 1 pod | None | Feature validation, integration tests |
| **Staging** | Every `release/*` merge | Isolated Supabase staging | 2 pods | Manual | QA, UAT, load testing |
| **Production** | Manual promotion | Full Supabase (Multi-AZ + replicas) | 2-6 pods | HPA (CPU + req/sec) | Live system |

### Branching Strategy

```
main ────┬───────────────┬──────────────────┬──────────────►
          \              /                  /
feature/  \──►  feat-1  /                  /
            \──────────/                  /
                                           /
release/    ┌─────────────────────────────/
            │ v1.1.0
            └────────────────────────────►
                                           \
hotfix/     ┌──────────────────────────────\
            │ fix-cpu-spike                 \
            └────────────────────────────────►
```

| Branch | Environment | Lifecycle |
|--------|-------------|-----------|
| `feature/*` | Local dev | Deleted after merge to `main` |
| `main` | Development | Always deployable, auto-deployed |
| `release/*` | Staging | Created from `main` at release time |
| `hotfix/*` | Staging | Created from `main` for urgent fixes |
| `main` (tagged) | Production | Tags like `v1.0.0` trigger prod deploy |

---

## Docker Containerization Strategy

### Multi-Stage Dockerfiles

Each app in the monorepo has a dedicated Dockerfile that leverages Turborepo's caching and Bun's fast install.

#### Server Dockerfile (`apps/server/Dockerfile`)

```dockerfile
# ─── Stage 1: Base ───────────────────────────────────────────
FROM oven/bun:1.3 AS base
WORKDIR /app

# ─── Stage 2: Dependencies ───────────────────────────────────
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/server/package.json apps/server/package.json
COPY packages/ ./packages/
RUN bun install --frozen-lockfile --production

# ─── Stage 3: Builder ────────────────────────────────────────
FROM base AS builder
COPY package.json bun.lock turbo.json ./
COPY apps/server/ ./apps/server/
COPY packages/ ./packages/
RUN bun install --frozen-lockfile
RUN bun run build --filter=server

# ─── Stage 4: Production ─────────────────────────────────────
FROM oven/bun:1.3-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health/ready || exit 1

USER bun
ENTRYPOINT ["bun", "run", "dist/index.mjs"]
```

#### Web Dockerfile (`apps/web/Dockerfile`)

```dockerfile
# ─── Stage 1: Base ───────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ─── Stage 2: Dependencies ───────────────────────────────────
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ ./packages/
RUN bun install --frozen-lockfile

# ─── Stage 3: Builder ────────────────────────────────────────
FROM base AS builder
COPY package.json bun.lock turbo.json ./
COPY apps/web/ ./apps/web/
COPY packages/ ./packages/
RUN bun install --frozen-lockfile
RUN bun run build --filter=web

# ─── Stage 4: Production ─────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

USER node
ENTRYPOINT ["bun", "run", "start"]
```

> **Note:** The native (Expo) app is not containerized for server deployment. It is built via EAS Build and distributed through app stores. Its OTA updates are served through Expo's update channel system.

### Image Strategy

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Server base** | `oven/bun:1.3-slim` | Minimal runtime (~80MB), fast cold start |
| **Web base** | `node:20-alpine` | Next.js requires Node.js runtime |
| **Multi-stage** | 4 stages (base → deps → builder → prod) | Production image contains only runtime essentials |
| **Distroless?** | No (use slim/alpine) | Need shell for health checks and debugging |
| **Image scanning** | Trivy in CI/CD | CVE scanning before registry push |
| **Tagging** | `git-sha` (immutable) + `latest` | Traceable deployments; immutable tags prevent drift |
| **Registry** | ECR / GCR | Private registry within cloud provider |

### Image Build Optimisation

```bash
# Utilise Turborepo's remote caching to skip unchanged packages
# Build only the server app with its dependencies
bun run build --filter=server --continue

# Docker build with BuildKit caching
DOCKER_BUILDKIT=1 docker build \
  --cache-from type=gha \
  --cache-to type=gha,mode=max \
  -t sentinel360-server:$GIT_SHA \
  -f apps/server/Dockerfile .
```

---

## CI/CD Pipeline Design

### Pipeline Overview

The CI/CD pipeline is implemented with **GitHub Actions** and follows a **secure-by-design** philosophy: every commit is linted, tested, scanned for vulnerabilities, built, and deployed to development automatically. Staging and production deployments require additional gates.

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ 1. Lint  │──►│ 2. Test  │──►│ 3. Build │──►│ 4. Scan  │──►│ 5. Push  │
│ & Type   │   │ (Unit +  │   │ (Docker  │   │ (Trivy,  │   │ (ECR)    │
│ Check    │   │  Int)    │   │  Image)  │   │  Snyk)   │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘
                                                                  │
                                                         ┌────────▼────────┐
                                                         │ 6. Deploy       │
                                                         │ (ArgoCD /       │
                                                         │  kubectl)       │
                                                         │                 │
                                                         │ Dev → Staging → │
                                                         │ Prod (manual)   │
                                                         └─────────────────┘
```

### GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, 'release/*', 'hotfix/*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com
  SERVER_IMAGE: sentinel360-server
  WEB_IMAGE: sentinel360-web

jobs:
  # ─── Job 1: Quality & Security Gates ─────────────────────
  quality-gate:
    name: Quality & Security
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      actions: read

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.11

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Type check
        run: bun run check-types

      - name: Lint
        run: bun run lint

      - name: Unit & Integration tests
        run: bun run test -- --reporter=verbose
        env:
          DATABASE_URL: ${{ secrets.DEV_DATABASE_URL }}

      - name: Dependency vulnerability scan
        uses: snyk/actions/node@v3
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  # ─── Job 2: Docker Build & Push ───────────────────────────
  build-and-push:
    name: Build & Push Images
    needs: [quality-gate]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [server, web]
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Set image tag
        id: vars
        run: echo "sha_short=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: Build and tag Docker image
        run: |
          docker build \
            --cache-from type=gha \
            --cache-to type=gha,mode=max \
            -t $REGISTRY/${{ matrix.app }}:${{ steps.vars.outputs.sha_short }} \
            -t $REGISTRY/${{ matrix.app }}:latest \
            -f apps/${{ matrix.app }}/Dockerfile .

      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ format('{0}/{1}:{2}', env.REGISTRY, matrix.app, steps.vars.outputs.sha_short) }}
          format: sarif
          output: trivy-results-${{ matrix.app }}.sarif
          severity: CRITICAL,HIGH
          exit-code: 1

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results-${{ matrix.app }}.sarif

      - name: Push images
        run: |
          docker push $REGISTRY/${{ matrix.app }}:${{ steps.vars.outputs.sha_short }}
          docker push $REGISTRY/${{ matrix.app }}:latest

  # ─── Job 3: Deploy ────────────────────────────────────────
  deploy:
    name: Deploy
    needs: [build-and-push]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name sentinel360-${{ env.ENVIRONMENT }} --region ${{ secrets.AWS_REGION }}

      - name: Set image tag
        id: vars
        run: echo "sha_short=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: Deploy to Kubernetes
        run: |
          # Determine environment from branch
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            ENV="dev"
          elif [[ "${{ github.ref }}" == refs/heads/release/* ]]; then
            ENV="staging"
          elif [[ "${{ github.ref }}" == refs/heads/hotfix/* ]]; then
            ENV="staging"
          else
            echo "Unknown branch, skipping deploy"
            exit 0
          fi

          # Update deployment images
          kubectl set image deployment/server \
            server=$REGISTRY/sentinel360-server:${{ steps.vars.outputs.sha_short }} \
            -n sentinel360-$ENV

          kubectl set image deployment/web \
            web=$REGISTRY/sentinel360-web:${{ steps.vars.outputs.sha_short }} \
            -n sentinel360-$ENV

          # Wait for rollout with timeout
          kubectl rollout status deployment/server -n sentinel360-$ENV --timeout=5m
          kubectl rollout status deployment/web -n sentinel360-$ENV --timeout=5m

      - name: Post-deploy health check
        run: |
          sleep 10
          curl -f https://api-$ENV.sentinel360.io/health/ready && \
          curl -f https://app-$ENV.sentinel360.io/health

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "channel": "#deployments",
              "text": "${{ job.status == 'success' && '✅' || '❌' }} Deploy to ${{ env.ENVIRONMENT }}: ${{ job.status }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_DEPLOY_WEBHOOK }}
```

### Deployment Strategy: Blue-Green (Production)

Production uses a **blue-green deployment** strategy to achieve zero-downtime releases:

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

### Automated Rollback Triggers

The pipeline automatically triggers a rollback if any of the following conditions are met within 15 minutes of deployment:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| HTTP error rate | > 5% over 5 minutes | Rollback to previous version |
| p95 latency | > 2s over 5 minutes | Rollback to previous version |
| Health check failure | 3 consecutive failures | Rollback to previous version |
| Database migration failure | Any migration error | Rollback + notify DBA |

### Release Promotion Process

```bash
# Step 1: Create release branch from main
git checkout main && git pull
git checkout -b release/v1.1.0
git push origin release/v1.1.0

# → CI/CD automatically deploys to staging

# Step 2: Run integration tests against staging
# → Manual QA verification in staging environment

# Step 3: Tag and promote to production
git checkout main
git tag v1.1.0
git push origin v1.1.0

# Step 4: Manually trigger production deploy via GitHub Actions
# → "Deploy to Production" workflow with environment approval gate
```

---

## Environment Variables Management

### Validation Layer

All environment variables are validated at build/start time using **Zod schemas** defined in the `@Sentinel360/env` package:

```typescript
// packages/env/src/index.ts
import { z } from "zod";

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(["development", "staging", "production"]),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_URL: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().url(),

  // Kafka
  KAFKA_BROKERS: z.string(),
  KAFKA_CLIENT_ID: z.string().default("sentinel360"),

  // Auth
  AUTH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),

  // S3
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Monitoring
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("❌ Invalid environment variables:", result.error.format());
      process.exit(1);
    }
    cachedEnv = result.data;
  }
  return cachedEnv;
}
```

### Environment File Strategy

| Environment | File | Source | Contains Secrets? |
|-------------|------|--------|-------------------|
| Local dev | `.env.local` | Developer machine | Yes (local Supabase) |
| Development | `.env.dev` | GitHub Actions secrets + Kubernetes Secrets | No (injected at runtime) |
| Staging | `.env.staging` | GitHub Actions secrets + Kubernetes Secrets | No (injected at runtime) |
| Production | `.env.production` | GitHub Actions secrets + Kubernetes Secrets | No (injected at runtime) |

### Kubernetes Secret Injection

```yaml
# k8s/base/server-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: server-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: server-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: sentinel360/prod/database
        property: DATABASE_URL
    - secretKey: AUTH_SECRET
      remoteRef:
        key: sentinel360/prod/auth
        property: AUTH_SECRET
    - secretKey: SUPABASE_SERVICE_ROLE_KEY
      remoteRef:
        key: sentinel360/prod/supabase
        property: SERVICE_ROLE_KEY
```

---

## Database Migrations in Production

### Migration Strategy

Sentinel360 uses **Drizzle ORM** with the `@Sentinel360/db` package for schema definitions and migrations. Migrations are run as part of the CI/CD pipeline, not at application boot.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Migration Workflow                            │
│                                                                 │
│   Developer                                 CI/CD               │
│   ┌──────────────┐                       ┌──────────────┐      │
│   │ 1. Edit      │                       │ 5. Run       │      │
│   │    schema.ts │                       │    db:migrate│      │
│   └──────┬───────┘                       │    on DB     │      │
│          ▼                               └──────┬───────┘      │
│   ┌──────────────┐                              │              │
│   │ 2. Generate  │                              ▼              │
│   │    migration │                       ┌──────────────┐      │
│   │    (drizzle  │                       │ 6. Deploy    │      │
│   │     kit)     │                       │    new app   │      │
│   └──────┬───────┘                       │    version   │      │
│          ▼                               └──────────────┘      │
│   ┌──────────────┐                                             │
│   │ 3. Commit    │                                             │
│   │    migration │                                             │
│   │    files     │                                             │
│   └──────┬───────┘                                             │
│          ▼                                                     │
│   ┌──────────────┐                                             │
│   │ 4. Open PR   │                                             │
│   └──────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Migration Commands

```bash
# Local development
bun run db:generate    # Generate migration from schema changes
bun run db:push        # Push schema directly (dev only — no migration file)

# CI/CD
bun run db:migrate     # Apply pending migrations (safe, transactional)

# Studio
bun run db:studio      # Open Drizzle Studio for data inspection
```

### Safe Migration Practices

| Practice | Implementation |
|----------|---------------|
| **Backward-compatible changes only** | All migrations must be additive (new columns have defaults, no destructive renames) |
| **Expand-contract pattern** | Add new column → deploy app to write both → remove old column in next release |
| **Transactional migrations** | Each migration runs in its own transaction; rollback on failure |
| **Pre-deploy migration step** | Migrations run *before* the new app version is deployed |
| **Manual approval for production** | Production migrations require a second operator approval |
| **Migration dry-run** | `drizzle-kit push --dry` to preview changes before applying |

### Production Migration CI Step

```yaml
migrate-database:
  name: Run Database Migrations
  needs: [quality-gate]
  runs-on: ubuntu-latest
  environment: ${{ github.ref == 'refs/heads/main' && 'development' || 'staging' }}
  steps:
    - uses: actions/checkout@v4
    - name: Setup Bun
      uses: oven-sh/setup-bun@v2
      with:
        bun-version: 1.3.11
    - name: Install dependencies
      run: bun install --frozen-lockfile
    - name: Run migrations
      run: bun run db:migrate
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
    - name: Verify migration
      run: bun run db:verify  # Custom script to confirm schema matches
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Rollback Strategy

```bash
# Step 1: Identify the migration to roll back
bun run db:status

# Step 2: Roll back the last migration
bun run db:rollback

# Step 3: Verify rollback
bun run db:status

# Step 4: Re-deploy the previous application version
kubectl rollout undo deployment/server -n sentinel360-prod
```

---

## Monitoring & Observability

### Observability Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Metrics** | Prometheus + Grafana | System metrics (CPU, memory, request latency, queue depth) |
| **Logging** | Loki (aggregated) + structured JSON logs | Centralized log search and correlation |
| **Tracing** | OpenTelemetry + Jaeger/Tempo | Distributed tracing across services and background jobs |
| **Alerting** | AlertManager + PagerDuty + Slack | Incident alerting and escalation |
| **Dashboards** | Grafana (custom dashboards) | Business + technical dashboards |
| **Uptime** | CloudWatch Synthetics / Grafana Cloud | Synthetic monitoring of critical user journeys |
| **Error tracking** | Sentry | Real-time error tracking and release health |

### Health Check Endpoints

Every service exposes standard health check endpoints:

```typescript
// apps/server/src/health/health.controller.ts
import { Hono } from "hono";

const healthApp = new Hono();

// Liveness probe — is the process alive?
healthApp.get("/health/live", (c) => c.json({ status: "alive" }));

// Readiness probe — can the service handle traffic?
healthApp.get("/health/ready", async (c) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    kafka: await checkKafka(),
    supabase: await checkSupabase(),
  };

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");
  const statusCode = allHealthy ? 200 : 503;

  return c.json(
    { status: allHealthy ? "ready" : "degraded", checks },
    statusCode
  );
});

// Startup probe — has the service finished initialising?
healthApp.get("/health/startup", async (c) => {
  const isStarted = await checkStartupComplete();
  return c.json(
    { status: isStarted ? "started" : "starting" },
    isStarted ? 200 : 503
  );
});
```

### Kubernetes Probe Configuration

```yaml
# k8s/base/server-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: server
  template:
    metadata:
      labels:
        app: server
    spec:
      containers:
        - name: server
          image: sentinel360-server:latest
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - secretRef:
                name: server-secrets
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            initialDelaySeconds: 10
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            initialDelaySeconds: 20
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 2
          startupProbe:
            httpGet:
              path: /health/startup
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 30
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1500m
              memory: 1Gi
```

### Key Metric Dashboards

| Dashboard | Audience | Key Metrics |
|-----------|----------|-------------|
| **System Health** | DevOps | CPU/memory per pod, DB connections, Kafka lag, error rates |
| **API Performance** | Backend Team | p50/p95/p99 latency, requests/sec, error rate by endpoint |
| **AI Pipeline** | ML Team | Inference latency, model accuracy, queue depths, false positive rate |
| **Business KPIs** | Product/Stakeholders | Active cases, alerts generated, sightings submitted |
| **Security** | Security Team | Failed logins, permission denials, evidence access, audit log volume |

### Alert Thresholds

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| API p95 latency > 2s | Over 5-minute window | Critical | PagerDuty + Slack |
| Error rate > 5% | Over 5-minute window | Critical | PagerDuty + Slack |
| Kafka consumer lag > 10,000 | Any consumer group | High | PagerDuty + Slack |
| DB connection count > 80% | Primary database | Critical | PagerDuty + Slack |
| Pod crash loop | >3 restarts in 10 minutes | Critical | PagerDuty + Slack |
| Disk space > 85% | Any persistent volume | High | Slack |
| Evidence hash mismatch | Chain verification fails | Critical | PagerDuty + phone |
| AI model accuracy drop | >5% below baseline | High | Slack + email |

### Structured Logging

All services output structured JSON logs for aggregation in Loki:

```typescript
// packages/logger/src/index.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
      "body.secret",
    ],
    censor: "[REDACTED]",
  },
});

// Usage
logger.info({ userId, action: "case.created" }, "Case created successfully");
logger.error({ err, caseId }, "Failed to create case");
```

---

## Secrets Management

### Philosophy

Secrets are **never stored in source code**, never in environment files committed to Git, and never in CI/CD logs. All secrets are managed through a combination of:

1. **AWS Secrets Manager** — Master secret store for all environments
2. **External Secrets Operator** — Kubernetes operator that syncs secrets into the cluster
3. **GitHub Actions Secrets** — CI/CD pipeline secrets for deployment
4. **Hashicorp Vault** (optional, future) — Dynamic secrets for database credentials

### Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ AWS Secrets      │────►│ External Secrets │────►│ Kubernetes       │
│ Manager          │     │ Operator (ESO)   │     │ Secrets          │
│                  │     │                  │     │                  │
│ /sentinel360/    │     │ ClusterSecretStore│    │ server-secrets   │
│   prod/database  │     │                  │     │ web-secrets      │
│   prod/auth      │     │ SyncInterval: 1h │     │ native-secrets   │
│   prod/supabase  │     │                  │     │                  │
│   staging/*      │     │                  │     │                  │
│   dev/*          │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Secret Hierarchy

```
AWS Secrets Manager
├── /sentinel360/
│   ├── dev/
│   │   ├── database      → DATABASE_URL, DATABASE_POOL_URL
│   │   ├── auth          → AUTH_SECRET, JWT_SECRET
│   │   ├── supabase      → SUPABASE_URL, SERVICE_ROLE_KEY
│   │   ├── redis         → REDIS_URL
│   │   └── kafka         → KAFKA_BROKERS, KAFKA_API_KEY
│   ├── staging/
│   │   └── ... (mirrors dev structure, isolated credentials)
│   └── production/
│       ├── database      → DATABASE_URL (Multi-AZ primary)
│       ├── auth          → AUTH_SECRET (rotated quarterly)
│       ├── supabase      → SUPABASE_URL, SERVICE_ROLE_KEY
│       ├── redis         → REDIS_URL (cluster mode)
│       ├── kafka         → KAFKA_BROKERS, KAFKA_SSL_CERT
│       ├── s3            → S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
│       ├── monitoring    → OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN
│       └── notifications → SLACK_WEBHOOK_URL, TWILIO_CREDENTIALS
```

### Secret Rotation Policy

| Secret Type | Rotation Schedule | Rotation Method | Downtime Required? |
|-------------|------------------|-----------------|-------------------|
| Database passwords | Every 90 days | Automated (AWS RDS rotation) | No (connection pool handles rotation) |
| JWT signing keys | Every 180 days | Manual (key rotation window) | No (both keys valid during overlap) |
| API keys (third-party) | Every 365 days | Manual | Depends on provider |
| TLS certificates | Every 90 days | Automated (cert-manager) | No |
| Supabase service role key | Every 180 days | Manual | Brief window during rotation |

### Emergency Secret Access

In the event of an emergency (e.g., on-call engineer needs to access a secret):

```bash
# Access a specific secret (logged and audited)
aws secretsmanager get-secret-value \
  --secret-id /sentinel360/production/database \
  --region us-east-1 \
  --query SecretString \
  --output text

# All secret access is logged in CloudTrail
# Only authorized IAM roles can read production secrets
```

---

## Runbooks

### Common Deployment Operations

| Operation | Command |
|-----------|---------|
| Check deployment status | `kubectl rollout status deployment/server -n sentinel360-prod` |
| View pod logs | `kubectl logs -f deployment/server -n sentinel360-prod` |
| Restart deployment | `kubectl rollout restart deployment/server -n sentinel360-prod` |
| Rollback deployment | `kubectl rollout undo deployment/server -n sentinel360-prod` |
| Scale replicas | `kubectl scale deployment/server --replicas=5 -n sentinel360-prod` |
| Port-forward to pod | `kubectl port-forward deployment/server 3000:3000 -n sentinel360-prod` |
| Describe pod issues | `kubectl describe pod -l app=server -n sentinel360-prod` |
| Get pod resource usage | `kubectl top pod -l app=server -n sentinel360-prod` |

### Emergency Rollback Procedure

```bash
# 1. Verify the issue
kubectl logs -n sentinel360-prod --tail=100 deployment/server | grep ERROR

# 2. Rollback the deployment
kubectl rollout undo deployment/server -n sentinel360-prod

# 3. Wait for rollback to complete
kubectl rollout status deployment/server -n sentinel360-prod --timeout=5m

# 4. Verify health
curl -f https://api.sentinel360.io/health/ready

# 5. Run smoke tests
bun run test:smoke --env=production

# 6. Notify team
# → Slack #incidents channel
# → Update incident in OpsGenie/PagerDuty
```

### Database Emergency Rollback

```bash
# 1. Identify the last good migration
bun run db:status

# 2. Rollback the failed migration
bun run db:rollback --step=1

# 3. Verify database state
bun run db:status

# 4. Re-deploy previous application version
kubectl rollout undo deployment/server -n sentinel360-prod

# 5. Verify application health
curl -f https://api.sentinel360.io/health/ready
```

---

## Appendices

### A. Infrastructure Resource Map

| Resource | Dev | Staging | Production |
|----------|-----|---------|------------|
| Kubernetes cluster | `sentinel360-dev` (small) | `sentinel360-staging` (medium) | `sentinel360-prod` (large, Multi-AZ) |
| Node pool (general) | t3.medium × 2 | t3.large × 3 | t3.xlarge × 3-10 |
| Node pool (GPU) | None | g4dn.xlarge × 1 | g4dn.xlarge × 2-4 |
| Database | db.t3.medium (single) | db.r6g.large (single) | db.r6g.xlarge (Multi-AZ + 2 read replicas) |
| Redis | cache.t3.micro | cache.t3.small | cache.r6g.large (cluster mode) |
| Kafka | 1 broker (t3.small) | 2 brokers (t3.medium) | 3 brokers (m5.large, Multi-AZ) |
| S3 buckets | 3 (raw, processed, evidence) | 3 (raw, processed, evidence) | 5 (raw, processed, evidence, 3d-models, backups) |

### B. Deployment Checklist

Pre-deployment checklist for production releases:

- [ ] All migrations generated, committed, and reviewed
- [ ] Database migration dry-run completed against staging
- [ ] Integration tests passing against staging
- [ ] Load test results within acceptable thresholds
- [ ] Security scan (Trivy + Snyk) passing with zero critical findings
- [ ] Changelog updated and release notes drafted
- [ ] Rollback plan documented
- [ ] On-call engineer notified of upcoming deployment
- [ ] Feature flags verified (new features behind flags)
- [ ] Monitoring dashboards reviewed for baseline

### C. Troubleshooting Quick Reference

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| Pod stuck in `CrashLoopBackOff` | Config error or missing env var | `kubectl logs` + `kubectl describe` |
| Readiness probe failing | DB or Redis unavailable | Check `kubectl exec` into pod, test connectivity |
| High latency after deploy | Database query regression | Check `pg_stat_statements`, look for slow queries |
| Deployment rollout stalled | Resource limits hit | `kubectl describe pod` for resource warnings |
| Image pull error | Registry auth misconfiguration | Check `imagePullSecrets` and ECR token expiry |
| Migration failed | Existing data incompatible with new schema | Rollback migration, inspect conflicting rows |

---

**DevOps Automator:** [DevOps Engineer]  
**Infrastructure Date:** June 2026  
**Deployment:** Fully automated with zero-downtime capability  
**Monitoring:** Comprehensive observability and alerting active  
**Secrets:** AWS Secrets Manager + External Secrets Operator integrated
