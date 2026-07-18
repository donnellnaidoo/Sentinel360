# 06 — Testing Strategy

> **Sentinel360 Backend — Complete Testing Plan**
> Version: 1.0 | Last Updated: June 2026

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Pyramid](#2-test-pyramid)
3. [Unit Testing Setup](#3-unit-testing-setup)
4. [Integration Testing](#4-integration-testing)
5. [E2E Testing](#5-e2e-testing)
6. [Test Database Setup](#6-test-database-setup)
7. [Mock Strategies](#7-mock-strategies)
8. [Coverage Targets](#8-coverage-targets)
9. [Example Test Files](#9-example-test-files)

---

## 1. Testing Philosophy

### Principles

1. **Test behavior, not implementation**: Tests should verify what the code does, not how
2. **Fast feedback**: Unit tests complete in < 1s, integration in < 10s
3. **Deterministic**: Same tests, same results, every time (no flaky tests)
4. **Isolated**: Each test is self-contained with its own data setup/teardown
5. **Readable as documentation**: Test names describe the scenario and expected outcome
6. **Parallel where safe**: Independent tests run concurrently for speed

### Test Naming Convention

```
[Unit|Integration|E2E] :: [Entity] :: [Scenario] :: [Expected Result]

Examples:
- Unit :: CaseService :: create with valid data :: returns case with generated number
- Integration :: POST /api/v1/cases :: without auth header :: returns 401
- Integration :: POST /api/v1/evidence :: with video file :: creates evidence with thumbnail
```

---

## 2. Test Pyramid

```
            /\
           /  \
          /    \
         / E2E  \        <-- 5%  (critical paths, 3rd party integrations)
        /────────\      
       /          \    
      / Integration \    <-- 25% (API routes, database, middleware)
     /───────────────\  
    /                  \
   /     Unit Tests     \ <-- 70% (services, utils, validators, models)
  /──────────────────────\
```

| Layer | Tool | Count Target | Runtime Budget |
|-------|------|-------------|----------------|
| **Unit** | Vitest | 400+ tests | < 2 seconds |
| **Integration** | Vitest + Supertest | 200+ tests | < 15 seconds |
| **E2E** | Vitest + Playwright | 20+ tests | < 60 seconds |

---

## 3. Unit Testing Setup

### 3.1 Vitest Configuration

```typescript
// vitest.config.ts

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["tests/setup.unit.ts"],
    globalSetup: "tests/global-setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "clover"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/server.ts",
        "src/types/**",
        "src/errors/index.ts",
        "src/config/**",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 15000,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@config": path.resolve(__dirname, "./src/config"),
        "@services": path.resolve(__dirname, "./src/services"),
        "@controllers": path.resolve(__dirname, "./src/controllers"),
        "@middleware": path.resolve(__dirname, "./src/middleware"),
        "@validators": path.resolve(__dirname, "./src/validators"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@errors": path.resolve(__dirname, "./src/errors"),
        "@types": path.resolve(__dirname, "./src/types"),
        "@integrations": path.resolve(__dirname, "./src/integrations"),
        "@events": path.resolve(__dirname, "./src/events"),
      },
    },
  },
});
```

### 3.2 Unit Test Global Setup

```typescript
// tests/setup.unit.ts

import { vi } from "vitest";
import "fake-indexeddb/auto";

// Mock Prisma globally for unit tests
vi.mock("@config/database", () => ({
  getPrisma: vi.fn(() => ({
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    case: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    evidence: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    criminalProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    sighting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    alert: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    alertRecipient: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    detectionEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    chainOfCustodyEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    caseSuspect: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    notificationToken: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((fn: any) => fn()),
  })),
}));

// Mock Redis globally
vi.mock("@config/redis", () => ({
  getRedis: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    keys: vi.fn(),
    publish: vi.fn(),
    lpush: vi.fn(),
    lrange: vi.fn(),
    pipeline: vi.fn(() => ({
      del: vi.fn(),
      exec: vi.fn(),
    })),
    quit: vi.fn(),
    call: vi.fn(),
    duplicate: vi.fn(() => ({
      connect: vi.fn(),
      subscribe: vi.fn(),
    })),
  })),
}));
```

### 3.3 Unit Test Fixtures

```typescript
// tests/fixtures/user.fixtures.ts

import { nanoid } from "nanoid";

export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? nanoid(),
    email: overrides.email ?? "test@example.com",
    passwordHash: "$2a$12$hashedpassword",
    name: overrides.name ?? "Test User",
    phoneNumber: overrides.phoneNumber ?? null,
    role: overrides.role ?? "COMMUNITY",
    status: overrides.status ?? "ACTIVE",
    avatarUrl: null,
    emailVerifiedAt: overrides.emailVerifiedAt ?? new Date(),
    twoFactorEnabled: false,
    twoFactorSecret: null,
    lastLoginAt: null,
    lastLoginIp: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    alertRadius: 10,
    preferences: {},
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

export function createMockCase(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? nanoid(),
    caseNumber: overrides.caseNumber ?? `SEN360-2026-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`,
    title: overrides.title ?? "Test Investigation Case",
    description: "A test case for unit testing purposes",
    status: "OPEN",
    priority: "MEDIUM",
    incidentDate: null,
    incidentLocation: null,
    crimeType: "THEFT",
    assignedToId: null,
    createdById: nanoid(),
    version: 1,
    metadata: {},
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}
```

---

## 4. Integration Testing

### 4.1 Integration Test Configuration

```typescript
// vitest.integration.config.ts

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup.integration.ts"],
    globalSetup: "tests/global-setup.ts",
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@config": path.resolve(__dirname, "./src/config"),
        "@services": path.resolve(__dirname, "./src/services"),
        "@controllers": path.resolve(__dirname, "./src/controllers"),
        "@middleware": path.resolve(__dirname, "./src/middleware"),
        "@validators": path.resolve(__dirname, "./src/validators"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@errors": path.resolve(__dirname, "./src/errors"),
        "@types": path.resolve(__dirname, "./src/types"),
        "@integrations": path.resolve(__dirname, "./src/integrations"),
        "@events": path.resolve(__dirname, "./src/events"),
      },
    },
  },
});
```

### 4.2 Integration Test Setup

```typescript
// tests/setup.integration.ts

import { beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { config } from "@config/env";
import app from "@app";

// Use test database
process.env.DATABASE_URL = config.DATABASE_URL.replace("sentinel360", "sentinel360_test");

export const testPrisma = new PrismaClient();
export let testApp: Express.Application;

beforeAll(async () => {
  // Run migrations on test database
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });

  testApp = app;
});

beforeEach(async () => {
  // Clean all tables before each test (preserve deterministic state)
  const tablenames = await testPrisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  for (const { tablename } of tablenames) {
    if (tablename !== "_prisma_migrations") {
      await testPrisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tablename}" CASCADE;`,
      );
    }
  }
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
```

### 4.3 Test Helper: Auth Token Generation

```typescript
// tests/helpers/auth.ts

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { testPrisma } from "../setup.integration";
import { config } from "@config/env";

export async function createTestUser(role: string = "COMMUNITY") {
  const passwordHash = await bcrypt.hash("TestPass123!", 12);

  const user = await testPrisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      passwordHash,
      name: "Test User",
      role: role as any,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  return user;
}

export function generateTestToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role, type: "access", jti: crypto.randomUUID() },
    config.JWT_ACCESS_SECRET,
    { expiresIn: "15m", issuer: config.JWT_ISSUER },
  );
}

export async function createAuthenticatedRequest(role: string = "COMMUNITY") {
  const user = await createTestUser(role);
  const token = generateTestToken(user.id, role);
  return { user, token, authHeader: `Bearer ${token}` };
}
```

---

## 5. E2E Testing

```typescript
// tests/e2e/auth-flow.test.ts

import { describe, it, expect, beforeAll } from "vitest";
import axios from "axios";

const API_URL = "http://localhost:4000/api/v1";

describe("E2E :: Authentication Flow", () => {
  const testUser = {
    name: "E2E Test User",
    email: `e2e-${Date.now()}@example.com`,
    password: "ComplexPass123!",
  };

  let accessToken: string;
  let refreshTokenCookie: string;

  it("should register a new user", async () => {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.requiresEmailVerification).toBe(true);
  });

  it("should login with valid credentials", async () => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password,
    });
    expect(response.status).toBe(200);
    expect(response.data.data.accessToken).toBeDefined();
    accessToken = response.data.data.accessToken;
    refreshTokenCookie = response.headers["set-cookie"]?.[0] ?? "";
  });

  it("should refresh token", async () => {
    const response = await axios.post(
      `${API_URL}/auth/refresh`,
      {},
      { headers: { Cookie: refreshTokenCookie } },
    );
    expect(response.status).toBe(200);
    expect(response.data.data.accessToken).toBeDefined();
    accessToken = response.data.data.accessToken;
  });

  it("should access protected route with valid token", async () => {
    const response = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status).toBe(200);
    expect(response.data.data.email).toBe(testUser.email);
  });

  it("should reject requests without auth", async () => {
    try {
      await axios.get(`${API_URL}/me`);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
});
```

---

## 6. Test Database Setup

### 6.1 CI Database Service (GitHub Actions)

```yaml
# .github/workflows/test.yml excerpt

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

  minio:
    image: minio/minio:latest
    env:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - 9000:9000
    command: server /data
```

### 6.2 Docker Compose for Local Testing

```yaml
# docker-compose.test.yml

services:
  postgres-test:
    image: postgis/postgis:16-3.4
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: sentinel
      POSTGRES_PASSWORD: test
      POSTGRES_DB: sentinel360_test
    tmpfs: /var/lib/postgresql/data  # In-memory for speed

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    tmpfs: /data
```

### 6.3 Test Database URL

```
# .env.test
DATABASE_URL=postgresql://sentinel:test@localhost:5433/sentinel360_test?schema=public
REDIS_URL=redis://localhost:6380
NODE_ENV=test
```

---

## 7. Mock Strategies

### 7.1 External Service Mocks

| Service | Mock Strategy | Library |
|---------|--------------|---------|
| **S3/MinIO** | Mock S3 client methods | `nock` or in-memory S3 mock |
| **Elasticsearch** | Mock search client | `nock` for HTTP requests |
| **AI Microservice** | Mock HTTP responses | `nock` for `AI_SERVICE_URL` |
| **Email (SMTP)** | Nodemailer mock (capture to array) | Custom mock transport |
| **Push Notifications** | Mock push service calls | `vi.fn()` |
| **File System** | Mock `fs` operations | `mock-fs` |

### 7.2 AI Service Mock Example

```typescript
// tests/mocks/ai-service.ts

import nock from "nock";
import { config } from "@config/env";

export function mockAIAnalysisSuccess(evidenceId: string) {
  return nock(config.AI_SERVICE_URL)
    .post("/analyze", (body: any) => body.evidenceId === evidenceId)
    .reply(200, {
      jobId: "mock-job-123",
      status: "queued",
      estimatedTime: 5000,
    });
}

export function mockAICallback(jobId: string, result: any) {
  return nock(config.APP_URL)
    .post(`/api/v1/ai/jobs/${jobId}/callback`)
    .reply(200, { received: true });
}
```

### 7.3 S3 Mock Example

```typescript
// tests/mocks/s3.ts

import { vi } from "vitest";

export function mockS3Client() {
  return {
    putObject: vi.fn().mockResolvedValue({ ETag: '"mocked-etag"' }),
    getObject: vi.fn().mockResolvedValue({
      Body: {
        transformToByteArray: vi.fn().mockResolvedValue(Buffer.from("mock-file-content")),
      },
    }),
    deleteObject: vi.fn().mockResolvedValue({}),
  };
}
```

---

## 8. Coverage Targets

### 8.1 Minimum Coverage Thresholds

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| **Services** | 90% | 85% | 90% | 90% |
| **Controllers** | 85% | 80% | 85% | 85% |
| **Middleware** | 95% | 90% | 95% | 95% |
| **Validators** | 100% | 100% | 100% | 100% |
| **Utils** | 90% | 85% | 90% | 90% |
| **WebSocket** | 80% | 75% | 80% | 80% |
| **Jobs** | 75% | 70% | 75% | 75% |
| **Overall** | **80%** | **75%** | **80%** | **80%** |

### 8.2 Coverage Report Generation

```bash
# Generate coverage report
npx vitest run --coverage

# Output files:
# - coverage/lcov.info  (for CI integration)
# - coverage/           (HTML report)
# - coverage/cobertura-coverage.xml  (for CI tools)

# CI will fail if thresholds are not met
```

---

## 9. Example Test Files

### 9.1 Unit Test: AuthService

```typescript
// tests/unit/services/auth.service.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { AuthService } from "@services/auth/auth.service";
import { getPrisma } from "@config/database";
import { createMockUser } from "@tests/fixtures/user.fixtures";

vi.mock("@config/database");
vi.mock("@config/redis");
vi.mock("bcryptjs");

describe("Unit :: AuthService :: register", () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  it("should register a new user with hashed password", async () => {
    const mockUser = createMockUser({ email: "new@example.com" });
    (bcrypt.hash as any).mockResolvedValue("$2a$12$hashed");
    (getPrisma().user.findUnique as any).mockResolvedValue(null);
    (getPrisma().user.create as any).mockResolvedValue(mockUser);

    const result = await authService.register({
      email: "new@example.com",
      password: "StrongPass1!",
      name: "New User",
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("new@example.com");
    expect(bcrypt.hash).toHaveBeenCalledWith("StrongPass1!", 12);
    expect(getPrisma().user.create).toHaveBeenCalledOnce();
  });

  it("should throw ConflictError when email already exists", async () => {
    const existingUser = createMockUser({ email: "exists@example.com" });
    (getPrisma().user.findUnique as any).mockResolvedValue(existingUser);

    await expect(
      authService.register({
        email: "exists@example.com",
        password: "StrongPass1!",
        name: "Duplicate User",
      }),
    ).rejects.toThrow("already exists");
  });

  it("should create user with PENDING_VERIFICATION status", async () => {
    (bcrypt.hash as any).mockResolvedValue("$2a$12$hashed");
    (getPrisma().user.findUnique as any).mockResolvedValue(null);
    (getPrisma().user.create as any).mockResolvedValue(
      createMockUser({ status: "PENDING_VERIFICATION" }),
    );

    const result = await authService.register({
      email: "pending@example.com",
      password: "StrongPass1!",
      name: "Pending User",
    });

    expect(result.requiresEmailVerification).toBe(true);
  });
});

describe("Unit :: AuthService :: login", () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  it("should login with valid credentials", async () => {
    const mockUser = createMockUser();
    (getPrisma().user.findUnique as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);

    const result = await authService.login("test@example.com", "CorrectPass1!", {
      ip: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.email).toBe("test@example.com");
  });

  it("should throw on invalid password", async () => {
    const mockUser = createMockUser();
    (getPrisma().user.findUnique as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(false);

    await expect(
      authService.login("test@example.com", "WrongPass1!", {
        ip: "127.0.0.1",
        userAgent: "vitest",
      }),
    ).rejects.toThrow("Invalid credentials");
  });

  it("should throw on unverified email", async () => {
    const mockUser = createMockUser({ emailVerifiedAt: null });
    (getPrisma().user.findUnique as any).mockResolvedValue(mockUser);

    await expect(
      authService.login("unverified@example.com", "StrongPass1!", {
        ip: "127.0.0.1",
        userAgent: "vitest",
      }),
    ).rejects.toThrow("verify");
  });

  it("should lock after 5 failed attempts", async () => {
    const mockUser = createMockUser({ failedLoginAttempts: 4 });
    (getPrisma().user.findUnique as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(false);

    await expect(
      authService.login("test@example.com", "WrongPass1!", {
        ip: "127.0.0.1",
        userAgent: "vitest",
      }),
    ).rejects.toThrow("locked");
  });
});
```

### 9.2 Integration Test: Cases API

```typescript
// tests/integration/cases.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { testApp, testPrisma } from "../setup.integration";
import { createAuthenticatedRequest } from "../helpers/auth";

describe("Integration :: Cases API", () => {
  describe("GET /api/v1/cases", () => {
    it("should return 401 without auth token", async () => {
      const response = await request(testApp).get("/api/v1/cases");
      expect(response.status).toBe(401);
    });

    it("should return empty list for new users", async () => {
      const { authHeader } = await createAuthenticatedRequest("LAW_ENFORCEMENT");

      const response = await request(testApp)
        .get("/api/v1/cases")
        .set("Authorization", authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it("should list cases with pagination meta", async () => {
      const { authHeader, user } = await createAuthenticatedRequest("ADMIN");

      // Create test cases
      await testPrisma.case.createMany({
        data: [
          { caseNumber: "SEN360-2026-00001", title: "Case 1", createdById: user.id },
          { caseNumber: "SEN360-2026-00002", title: "Case 2", createdById: user.id },
        ],
      });

      const response = await request(testApp)
        .get("/api/v1/cases")
        .set("Authorization", authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
      });
    });
  });

  describe("POST /api/v1/cases", () => {
    it("should create a case with auto-generated number", async () => {
      const { authHeader } = await createAuthenticatedRequest("LAW_ENFORCEMENT");

      const response = await request(testApp)
        .post("/api/v1/cases")
        .set("Authorization", authHeader)
        .send({
          title: "Armed Robbery Investigation",
          description: "Bank robbery at Main Street",
          crimeType: "ROBBERY",
          priority: "HIGH",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.caseNumber).toMatch(/^SEN360-\d{4}-\d{5}$/);
      expect(response.body.data.title).toBe("Armed Robbery Investigation");
    });

    it("should validate required fields", async () => {
      const { authHeader } = await createAuthenticatedRequest("LAW_ENFORCEMENT");

      const response = await request(testApp)
        .post("/api/v1/cases")
        .set("Authorization", authHeader)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
```

### 9.3 Integration Test: Evidence Upload

```typescript
// tests/integration/evidence.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import path from "path";
import { testApp, testPrisma } from "../setup.integration";
import { createAuthenticatedRequest } from "../helpers/auth";

describe("Integration :: Evidence API", () => {
  describe("POST /api/v1/cases/:caseId/evidence", () => {
    it("should upload image evidence with thumbnail", async () => {
      const { authHeader, user } = await createAuthenticatedRequest("LAW_ENFORCEMENT");

      // Create a case first
      const caseData = await testPrisma.case.create({
        data: {
          caseNumber: "SEN360-2026-TEST01",
          title: "Test Case for Evidence",
          createdById: user.id,
        },
      });

      const response = await request(testApp)
        .post(`/api/v1/cases/${caseData.id}/evidence`)
        .set("Authorization", authHeader)
        .attach("file", path.join(__dirname, "../fixtures/test-image.jpg"))
        .field("description", "Test evidence upload");

      expect(response.status).toBe(201);
      expect(response.body.data.fileName).toBe("test-image.jpg");
      expect(response.body.data.sha256Hash).toBeDefined();
      expect(response.body.data.thumbnailPath).toBeDefined();
    });

    it("should reject unsupported file types", async () => {
      const { authHeader, user } = await createAuthenticatedRequest("LAW_ENFORCEMENT");

      const caseData = await testPrisma.case.create({
        data: {
          caseNumber: "SEN360-2026-TEST02",
          title: "Test Case for Rejected Evidence",
          createdById: user.id,
        },
      });

      const response = await request(testApp)
        .post(`/api/v1/cases/${caseData.id}/evidence`)
        .set("Authorization", authHeader)
        .attach("file", path.join(__dirname, "../fixtures/test.exe"))
        .field("description", "Should be rejected");

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/cases/:caseId/evidence", () => {
    it("should list evidence with chain of custody count", async () => {
      const { authHeader, user } = await createAuthenticatedRequest("LAW_ENFORCEMENT");

      const caseData = await testPrisma.case.create({
        data: {
          caseNumber: "SEN360-2026-TEST03",
          title: "Evidence Listing Test",
          createdById: user.id,
        },
      });

      await testPrisma.evidence.createMany({
        data: [
          {
            caseId: caseData.id,
            fileName: "photo1.jpg",
            fileType: "IMAGE",
            mimeType: "image/jpeg",
            fileSize: 1024,
            filePath: "evidence/test1.jpg",
            sha256Hash: "abc123",
            uploadedById: user.id,
            chainOfCustody: [],
          },
        ],
      });

      const response = await request(testApp)
        .get(`/api/v1/cases/${caseData.id}/evidence`)
        .set("Authorization", authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });
});
```

### 9.4 Unit Test: Validators

```typescript
// tests/unit/validators/case.validator.test.ts

import { describe, it, expect } from "vitest";
import { createCaseSchema, caseQuerySchema } from "@validators/case.validator";

describe("Unit :: Validators :: Case", () => {
  describe("createCaseSchema", () => {
    it("should accept valid case data", () => {
      const result = createCaseSchema.parse({
        title: "Valid Investigation Case",
        crimeType: "BURGLARY",
        priority: "HIGH",
      });
      expect(result.title).toBe("Valid Investigation Case");
    });

    it("should set default priority to MEDIUM", () => {
      const result = createCaseSchema.parse({
        title: "Default Priority Case",
      });
      expect(result.priority).toBe("MEDIUM");
    });

    it("should reject title shorter than 5 characters", () => {
      expect(() =>
        createCaseSchema.parse({ title: "Hi" }),
      ).toThrow();
    });

    it("should reject invalid priority value", () => {
      expect(() =>
        createCaseSchema.parse({
          title: "Valid Title",
          priority: "URGENT",
        }),
      ).toThrow();
    });

    it("should reject invalid UUID for assignedToId", () => {
      expect(() =>
        createCaseSchema.parse({
          title: "Valid Title",
          assignedToId: "not-a-uuid",
        }),
      ).toThrow();
    });
  });

  describe("caseQuerySchema", () => {
    it("should parse string page numbers to integers", () => {
      const result = caseQuerySchema.parse({ page: "2" });
      expect(result.page).toBe(2);
    });

    it("should set default values for missing fields", () => {
      const result = caseQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("createdAt");
      expect(result.sortOrder).toBe("desc");
    });

    it("should reject limit exceeding 100", () => {
      expect(() => caseQuerySchema.parse({ limit: "200" })).toThrow();
    });
  });
});
```

---

## Summary

- **70% Unit / 25% Integration / 5% E2E** test distribution following the test pyramid
- **Vitest** with `supertest` for HTTP integration testing, TypeScript-native and fast
- **Mock strategies** for all external services (S3, Elasticsearch, AI, Email, Push)
- **Test database** with PostgreSQL + PostGIS in Docker, auto-migrated and truncated between tests
- **Comprehensive fixtures** with factory functions for all entity types
- **Coverage thresholds** at 80% overall, with 90%+ for critical modules (services, middleware)
- **CI integration** with GitHub Actions running all test layers on every push
- **Example test files** covering auth service, cases API, evidence upload, and validators
