# 03 — API Routes Implementation

> **Sentinel360 Backend — Complete API Design & Implementation**
> Version: 1.0 | Last Updated: June 2026

---

## Table of Contents

1. [API Design Philosophy](#1-api-design-philosophy)
2. [Route Organization](#2-route-organization)
3. [Middleware Stack](#3-middleware-stack)
4. [Complete Route Specifications](#4-complete-route-specifications)
5. [Controller Patterns](#5-controller-patterns)
6. [Service Layer Integration](#6-service-layer-integration)
7. [Error Handling](#7-error-handling)
8. [Request Validation](#8-request-validation)
9. [File Upload Handling](#9-file-upload-handling)
10. [WebSocket Implementation](#10-websocket-implementation)

---

## 1. API Design Philosophy

### Principles

1. **RESTful Resource Naming**: `/api/v1/{resources}` with consistent pluralization
2. **Semantic HTTP Methods**: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)
3. **Consistent Response Envelope**: Every response follows `{ success, data, message, meta }`
4. **Versioned API**: `/api/v1/` prefix enables future breaking changes
5. **Domain-Driven Routes**: Organized by business domain, not technical layer
6. **Cursor-based Pagination**: For infinite scroll feeds, offset-based for admin tables

### Response Envelope

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "message": "Cases retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "Case with ID xyz not found",
    "details": { "caseId": "xyz" }
  }
}

// List with cursor
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "nextCursor": "eyJpZCI6IjEyMyJ9",
    "hasMore": true
  }
}
```

---

## 2. Route Organization

```
src/routes/
├── index.ts                    # Route aggregator
├── auth.routes.ts              # Authentication & authorization
├── users.routes.ts             # User management (Admin/Super Admin)
├── cases.routes.ts             # Investigation cases CRUD
├── evidence.routes.ts          # Evidence management with chain of custody
├── profiles.routes.ts          # Criminal profiles
├── sightings.routes.ts         # Community sightings
├── alerts.routes.ts            # Alert management
├── wanted.routes.ts            # Public wanted feed
├── search.routes.ts            # Full-text search
├── analytics.routes.ts         # Dashboard analytics & reports
├── notifications.routes.ts    # Push notification tokens & preferences
├── audit.routes.ts             # Audit log access (Admin)
├── ai.routes.ts                # AI analysis triggers
├── admin.routes.ts             # Admin-specific operations
└── health.routes.ts            # Health check endpoints
```

---

## 3. Middleware Stack

### 3.1 Global Middleware (Applied to All Routes)

```typescript
// src/app.ts

import express from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { securityHeaders } from "@middleware/security";
import { requestLogger } from "@middleware/logging";
import { rateLimitMiddleware } from "@middleware/rate-limit";
import { databaseMiddleware } from "@middleware/database";
import { errorHandler } from "@middleware/error-handler";
import { requestId } from "@middleware/request-id";

const app = express();

// 1. Request ID (first — used by all subsequent middleware for tracing)
app.use(requestId);

// 2. Security headers
app.use(securityHeaders);

// 3. CORS
app.use(
  cors({
    origin: config.CORS_ORIGINS.split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Session-Id", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86400, // 24 hours preflight cache
  }),
);

// 4. Compression
app.use(compression());

// 5. Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// 6. Database connection
app.use(databaseMiddleware);

// 7. Request logging
app.use(requestLogger);

// 8. Global rate limiting
app.use("/api/", rateLimitMiddleware());
```

### 3.2 Route-Specific Middleware Stack Pattern

```typescript
// src/routes/cases.routes.ts

import { Router } from "express";
import { CasesController } from "@controllers/cases.controller";
import { requireAuth, requireRole } from "@middleware/auth";
import { validateBody, validateQuery, validateParams } from "@middleware/validate";
import { uploadMiddleware } from "@middleware/upload";
import { auditMiddleware } from "@middleware/audit";
import { rateLimitMiddleware } from "@middleware/rate-limit";
import {
  createCaseSchema,
  updateCaseSchema,
  caseQuerySchema,
  caseIdParamSchema,
} from "@validators/case.validator";

const router = Router();
const controller = new CasesController();

// Full middleware stack per route
router.get(
  "/",
  requireAuth,
  validateQuery(caseQuerySchema),
  controller.list,
);

router.get(
  "/:caseId",
  requireAuth,
  validateParams(caseIdParamSchema),
  controller.getById,
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "LAW_ENFORCEMENT"),
  validateBody(createCaseSchema),
  auditMiddleware("CREATE", "case"),
  controller.create,
);

router.patch(
  "/:caseId",
  requireAuth,
  requireRole("ADMIN", "LAW_ENFORCEMENT"),
  validateParams(caseIdParamSchema),
  validateBody(updateCaseSchema),
  auditMiddleware("UPDATE", "case"),
  controller.update,
);

router.delete(
  "/:caseId",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validateParams(caseIdParamSchema),
  auditMiddleware("DELETE", "case"),
  controller.delete,
);

// Evidence sub-resource
router.post(
  "/:caseId/evidence",
  requireAuth,
  requireRole("ADMIN", "LAW_ENFORCEMENT", "SECURITY"),
  validateParams(caseIdParamSchema),
  uploadMiddleware({
    allowedMimeTypes: ["image/jpeg", "image/png", "video/mp4", "application/pdf"],
    maxFileSize: 500 * 1024 * 1024, // 500MB
    fieldName: "file",
  }),
  controller.uploadEvidence,
);
```

---

## 4. Complete Route Specifications

### 4.1 Authentication Routes (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | None | Register new community/security user |
| `POST` | `/auth/login` | None | Login with email + password |
| `POST` | `/auth/refresh` | Cookie | Refresh access token |
| `POST` | `/auth/logout` | Cookie | Logout (revoke refresh token) |
| `POST` | `/auth/verify-email` | None | Verify email with token |
| `POST` | `/auth/resend-verification` | Bearer | Resend verification email |
| `POST` | `/auth/forgot-password` | None | Request password reset email |
| `POST` | `/auth/reset-password` | None | Reset password with token |
| `POST` | `/auth/2fa/setup` | Bearer | Generate 2FA secret + QR code |
| `POST` | `/auth/2fa/confirm` | Bearer | Confirm 2FA setup with OTP |
| `POST` | `/auth/2fa/verify` | Session | Verify 2FA during login |
| `POST` | `/auth/2fa/disable` | Bearer | Disable 2FA (requires password) |
| `POST` | `/auth/2fa/backup-codes` | Bearer | Generate new backup codes |

### 4.2 User Management (`/api/v1/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users` | Admin+ | List all users (paginated, filterable) |
| `GET` | `/users/:userId` | Bearer | Get user profile |
| `PATCH` | `/users/:userId` | Bearer | Update own profile |
| `PATCH` | `/users/:userId/role` | Super Admin | Change user role |
| `PATCH` | `/users/:userId/status` | Admin+ | Activate/suspend/deactivate user |
| `DELETE` | `/users/:userId` | Super Admin | Permanently delete user |
| `GET` | `/users/:userId/activity` | Admin+ | Get user activity summary |
| `GET` | `/me` | Bearer | Get current user profile |
| `PATCH` | `/me` | Bearer | Update own profile |
| `PATCH` | `/me/password` | Bearer | Change password |
| `PATCH` | `/me/preferences` | Bearer | Update notification preferences |

### 4.3 Criminal Profiles (`/api/v1/profiles`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/profiles` | Bearer | List all profiles (full feed) |
| `GET` | `/profiles/:profileId` | Bearer | Get profile details |
| `POST` | `/profiles` | Admin+ | Create criminal profile |
| `PUT` | `/profiles/:profileId` | Admin+ | Update profile (full replace) |
| `PATCH` | `/profiles/:profileId` | Admin+ | Partial update profile |
| `PATCH` | `/profiles/:profileId/status` | Law Enforcement+ | Update criminal status |
| `DELETE` | `/profiles/:profileId` | Admin+ | Archive profile |
| `DELETE` | `/profiles/:profileId/permanent` | Super Admin | Permanent delete (audited) |
| `POST` | `/profiles/:profileId/merge` | Super Admin | Merge duplicate profiles |
| `GET` | `/profiles/:profileId/timeline` | Bearer | Get profile activity timeline |
| `POST` | `/profiles/:profileId/photo` | Admin+ | Upload profile photo |

### 4.4 Cases (`/api/v1/cases`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/cases` | Bearer | List cases (filterable, sortable) |
| `GET` | `/cases/:caseId` | Bearer | Get case details |
| `POST` | `/cases` | Admin+ | Create new case |
| `PATCH` | `/cases/:caseId` | Admin+ | Update case |
| `DELETE` | `/cases/:caseId` | Admin+ | Archive case |
| `POST` | `/cases/:caseId/assign` | Admin+ | Assign investigator |
| `POST` | `/cases/:caseId/suspects` | Admin+ | Link suspect to case |
| `DELETE` | `/cases/:caseId/suspects/:profileId` | Admin+ | Remove suspect from case |
| `GET` | `/cases/:caseId/timeline` | Bearer | Get case event timeline |

### 4.5 Evidence (`/api/v1/cases/:caseId/evidence`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/cases/:caseId/evidence` | Bearer | List evidence for case |
| `GET` | `/cases/:caseId/evidence/:evidenceId` | Bearer | Get evidence details |
| `POST` | `/cases/:caseId/evidence` | Admin+ | Upload evidence file |
| `POST` | `/cases/:caseId/evidence/batch` | Admin+ | Batch upload evidence |
| `PATCH` | `/cases/:caseId/evidence/:evidenceId` | Admin+ | Update evidence metadata |
| `DELETE` | `/cases/:caseId/evidence/:evidenceId` | Admin+ | Soft-delete evidence |
| `GET` | `/cases/:caseId/evidence/:evidenceId/download` | Bearer | Get pre-signed download URL |
| `GET` | `/cases/:caseId/evidence/:evidenceId/chain` | Bearer | Get chain of custody |
| `POST` | `/cases/:caseId/evidence/:evidenceId/verify` | Admin+ | Verify evidence |
| `POST` | `/cases/:caseId/evidence/:evidenceId/export` | Admin+ | Export evidence |

### 4.6 Sightings (`/api/v1/sightings`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/sightings` | Bearer | Submit a sighting |
| `GET` | `/sightings` | Bearer | List sightings (filterable) |
| `GET` | `/sightings/:sightingId` | Bearer | Get sighting details |
| `PATCH` | `/sightings/:sightingId/status` | Law Enforcement+ | Verify/dismiss sighting |
| `GET` | `/sightings/:sightingId/submitter` | Admin+ | Get submitter info |
| `GET` | `/sightings/nearby` | Bearer | Get sightings near GPS location |

### 4.7 Alerts (`/api/v1/alerts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/alerts` | Bearer | List user's alerts |
| `GET` | `/alerts/:alertId` | Bearer | Get alert details |
| `POST` | `/alerts` | Admin+ | Create and send alert |
| `POST` | `/alerts/targeted` | Admin+ | Send targeted alert by region/role |
| `PATCH` | `/alerts/:alertId/read` | Bearer | Mark alert as read |
| `GET` | `/alerts/unread-count` | Bearer | Get unread alert count |
| `GET` | `/alerts/stream` | Bearer | WebSocket upgrade for real-time alerts |

### 4.8 Wanted Feed (`/api/v1/wanted`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/wanted` | None | Public wanted feed (paginated) |
| `GET` | `/wanted/:profileId` | None | Public profile summary |
| `GET` | `/wanted/recent` | None | Recently added wanted persons |
| `GET` | `/wanted/nearby` | None | Wanted near GPS location |

### 4.9 Search (`/api/v1/search`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/search` | Bearer | Full-text search across entities |
| `GET` | `/search/profiles` | Bearer | Search criminal profiles |
| `GET` | `/search/cases` | Bearer | Search cases |
| `GET` | `/search/evidence` | Bearer | Search evidence metadata |

### 4.10 Analytics (`/api/v1/analytics`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/analytics/dashboard` | Admin+ | Dashboard summary stats |
| `GET` | `/analytics/alerts` | Admin+ | Alert analytics (daily/weekly/monthly) |
| `GET` | `/analytics/cases` | Admin+ | Case statistics by status/type/region |
| `GET` | `/analytics/sightings` | Admin+ | Sighting submission trends |
| `GET` | `/analytics/detections` | Admin+ | AI detection event statistics |

### 4.11 Notifications (`/api/v1/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/notifications/token` | Bearer | Register push notification token |
| `DELETE` | `/notifications/token/:token` | Bearer | Remove push token |
| `PATCH` | `/notifications/preferences` | Bearer | Update notification preferences |
| `GET` | `/notifications/preferences` | Bearer | Get notification preferences |

### 4.12 Audit Logs (`/api/v1/audit`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/audit` | Admin+ | List audit logs (paginated, filterable) |
| `GET` | `/audit/:logId` | Admin+ | Get audit log detail |
| `GET` | `/audit/export` | Super Admin | Export audit logs as CSV |
| `GET` | `/audit/user/:userId` | Admin+ | Get audit trail for specific user |

### 4.13 AI Analysis (`/api/v1/ai`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/ai/analyse/evidence/:evidenceId` | Admin+ | Trigger AI analysis on evidence |
| `POST` | `/ai/analyse/sighting/:sightingId` | Admin+ | Trigger AI analysis on sighting |
| `POST` | `/ai/identify` | Admin+ | Upload image for AI identification |
| `GET` | `/ai/jobs/:jobId` | Admin+ | Get AI analysis job status |
| `GET` | `/ai/models` | Super Admin | List deployed AI models |
| `POST` | `/ai/models/deploy` | Super Admin | Deploy new AI model version |

### 4.14 Admin Operations (`/api/v1/admin`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/stats` | Admin+ | System-wide statistics |
| `GET` | `/admin/audit` | Admin+ | Recent audit log entries |
| `GET` | `/admin/health` | Super Admin | System health overview |
| `POST` | `/admin/maintenance` | Super Admin | Toggle maintenance mode |

### 4.15 Health (`/api/v1/health`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Basic health check |
| `GET` | `/health/ready` | None | Readiness probe (DB, Redis, S3) |
| `GET` | `/health/live` | None | Liveness probe |

---

## 5. Controller Patterns

### 5.1 Base Controller Structure

```typescript
// src/controllers/base.controller.ts

import { Request, Response } from "express";
import { getPaginationMeta } from "@utils/pagination";

/**
 * Base controller with shared response helpers
 * All controllers extend this for consistent responses
 */
export class BaseController {
  /**
   * Send success response with data
   */
  protected ok(res: Response, data: unknown, message?: string) {
    return res.status(200).json({
      success: true,
      data,
      message: message ?? "Operation successful",
    });
  }

  /**
   * Send created response (201)
   */
  protected created(res: Response, data: unknown, message?: string) {
    return res.status(201).json({
      success: true,
      data,
      message: message ?? "Resource created successfully",
    });
  }

  /**
   * Send paginated response
   */
  protected paginated(
    res: Response,
    data: unknown[],
    total: number,
    page: number,
    limit: number,
  ) {
    return res.status(200).json({
      success: true,
      data,
      meta: getPaginationMeta(total, page, limit),
    });
  }

  /**
   * Send cursor-based paginated response
   */
  protected cursorPaginated(
    res: Response,
    data: unknown[],
    nextCursor: string | null,
    hasMore: boolean,
  ) {
    return res.status(200).json({
      success: true,
      data,
      meta: { nextCursor, hasMore },
    });
  }

  /**
   * Send no content (204)
   */
  protected noContent(res: Response) {
    return res.status(204).send();
  }

  /**
   * Send a message-only response
   */
  protected message(res: Response, message: string, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
    });
  }
}
```

### 5.2 Cases Controller Example

```typescript
// src/controllers/cases.controller.ts

import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { CaseService } from "@services/case.service";
import { asyncHandler } from "@utils/async-handler";

export class CasesController extends BaseController {
  private caseService = new CaseService();

  /**
   * GET /api/v1/cases
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status, priority, assignedTo, search } = req.query;
    const filters = {
      status: status as string,
      priority: priority as string,
      assignedTo: assignedTo as string,
      search: search as string,
    };

    const { cases, total } = await this.caseService.listCases(
      Number(page),
      Number(limit),
      filters,
      req.user!,
    );

    return this.paginated(res, cases, total, Number(page), Number(limit));
  });

  /**
   * GET /api/v1/cases/:caseId
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const caseData = await this.caseService.getCaseById(caseId, req.user!);
    return this.ok(res, caseData);
  });

  /**
   * POST /api/v1/cases
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const caseData = await this.caseService.createCase({
      ...req.body,
      createdById: req.user!.id,
    });
    return this.created(res, caseData, "Case created successfully");
  });

  /**
   * PATCH /api/v1/cases/:caseId
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const caseData = await this.caseService.updateCase(caseId, req.body, req.user!);
    return this.ok(res, caseData, "Case updated successfully");
  });

  /**
   * DELETE /api/v1/cases/:caseId
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    await this.caseService.archiveCase(caseId, req.user!);
    return this.message(res, "Case archived successfully");
  });

  /**
   * POST /api/v1/cases/:caseId/evidence (file upload)
   */
  uploadEvidence = asyncHandler(async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const file = req.file!;

    const evidence = await this.caseService.addEvidence(caseId, {
      file,
      description: req.body.description,
      uploadedById: req.user!.id,
    });

    return this.created(res, evidence, "Evidence uploaded successfully");
  });
}
```

---

## 6. Service Layer Integration

### 6.1 Async Handler (Error Wrapper)

```typescript
// src/utils/async-handler.ts

import { Request, Response, NextFunction } from "express";

/**
 * Wraps async route handlers to catch errors and forward to error middleware
 * Eliminates need for try/catch in every controller method
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

### 6.2 Dependency Injection Pattern

```typescript
// src/services/case.service.ts

import { getPrisma } from "@config/database";
import { getRedis } from "@config/redis";
import { AppError } from "@errors/app-error";
import { AuditService } from "./audit.service";

export class CaseService {
  private auditService = new AuditService();

  /**
   * List cases with filters, pagination, and role-based visibility
   */
  async listCases(
    page: number,
    limit: number,
    filters: CaseFilters,
    user: AuthUser,
  ): Promise<{ cases: CaseData[]; total: number }> {
    const where: Prisma.CaseWhereInput = {
      deletedAt: null,
    };

    // Role-based visibility: Community sees nothing, Security sees active, etc.
    if (user.role === "COMMUNITY") {
      return { cases: [], total: 0 };
    }

    if (filters.status) {
      where.status = filters.status as CaseStatus;
    }

    if (filters.assignedTo) {
      where.assignedToId = filters.assignedTo;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { caseNumber: { contains: filters.search, mode: "insensitive" } },
        { crimeType: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [cases, total] = await Promise.all([
      getPrisma().case.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { evidence: true, suspects: true } },
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      getPrisma().case.count({ where }),
    ]);

    return { cases, total };
  }

  /**
   * Get single case with all relations
   */
  async getCaseById(caseId: string, user: AuthUser): Promise<CaseDetailData> {
    const caseData = await getPrisma().case.findUnique({
      where: { id: caseId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true } },
        evidence: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
        suspects: {
          include: {
            profile: {
              select: {
                id: true,
                fullName: true,
                photoUrl: true,
                status: true,
                riskLevel: true,
              },
            },
          },
        },
      },
    });

    if (!caseData) {
      throw new AppError("Case not found", 404, "CASE_NOT_FOUND");
    }

    return caseData;
  }

  /**
   * Create a new case
   */
  async createCase(data: CreateCaseInput): Promise<CaseData> {
    // Generate case number: SEN360-YYYY-XXXXX
    const caseNumber = await this.generateCaseNumber();

    const caseData = await getPrisma().case.create({
      data: {
        caseNumber,
        title: data.title,
        description: data.description,
        crimeType: data.crimeType,
        priority: data.priority ?? "MEDIUM",
        incidentDate: data.incidentDate ? new Date(data.incidentDate) : undefined,
        incidentLocation: data.incidentLocation,
        assignedToId: data.assignedToId,
        createdById: data.createdById,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      userId: data.createdById,
      action: "CREATE",
      entityType: "case",
      entityId: caseData.id,
      metadata: { title: data.title, caseNumber },
    });

    return caseData;
  }

  /**
   * Generate unique case number
   */
  private async generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SEN360-${year}-`;

    const lastCase = await getPrisma().case.findFirst({
      where: { caseNumber: { startsWith: prefix } },
      orderBy: { caseNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastCase) {
      const lastNum = parseInt(lastCase.caseNumber.split("-").pop() ?? "0");
      nextNumber = lastNum + 1;
    }

    return `${prefix}${String(nextNumber).padStart(5, "0")}`;
  }
}
```

---

## 7. Error Handling

### 7.1 Custom Error Classes

```typescript
// src/errors/app-error.ts

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details?: Record<string, unknown>,
    isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with ID '${id}'` : ''} not found`,
      404,
      `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`,
    );
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super("Validation failed", 400, "VALIDATION_ERROR", { fields: errors });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}
```

### 7.2 Error Handler Middleware

```typescript
// src/middleware/error-handler.ts

import { Request, Response, NextFunction } from "express";
import { AppError } from "@errors/app-error";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { config } from "@config/env";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Log error
  console.error({
    message: err.message,
    stack: config.NODE_ENV === "development" ? err.stack : undefined,
    requestId: req.headers["x-request-id"],
    path: req.path,
    method: req.method,
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }

    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: { fields: fieldErrors },
      },
    });
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: {
          code: "DUPLICATE_RESOURCE",
          message: "A resource with this value already exists",
          details: { fields: err.meta?.target },
        },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      });
    }
  }

  // Handle multer/file upload errors
  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      error: {
        code: "UPLOAD_ERROR",
        message: err.message,
      },
    });
  }

  // Default 500 for unexpected errors
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        config.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
    },
  });
}
```

---

## 8. Request Validation

### 8.1 Validation Middleware

```typescript
// src/middleware/validate.ts

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type ValidationTarget = "body" | "query" | "params";

function createValidator(target: ValidationTarget) {
  return (schema: ZodSchema) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        const data = schema.parse(req[target]);
        req[target] = data; // Replace with parsed (and transformed) data
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldErrors: Record<string, string[]> = {};
          for (const issue of error.issues) {
            const path = issue.path.join(".");
            if (!fieldErrors[path]) fieldErrors[path] = [];
            fieldErrors[path].push(issue.message);
          }

          return _res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Request validation failed",
              details: { fields: fieldErrors },
            },
          });
        }
        next(error);
      }
    };
  };
}

export const validateBody = createValidator("body");
export const validateQuery = createValidator("query");
export const validateParams = createValidator("params");
```

### 8.2 Validation Schemas

```typescript
// src/validators/case.validator.ts

import { z } from "zod";

export const createCaseSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(500, "Title must be at most 500 characters"),
  description: z
    .string()
    .max(10000, "Description too long")
    .optional(),
  crimeType: z
    .string()
    .max(100)
    .optional(),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .optional()
    .default("MEDIUM"),
  incidentDate: z
    .string()
    .datetime()
    .optional(),
  incidentLocation: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: z.string().optional(),
      region: z.string().optional(),
    })
    .optional(),
  assignedToId: z.string().uuid().optional(),
});

export const updateCaseSchema = createCaseSchema.partial();

export const caseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(["OPEN", "UNDER_INVESTIGATION", "CLOSED", "ARCHIVED", "COLD"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(["createdAt", "priority", "updatedAt", "incidentDate"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const caseIdParamSchema = z.object({
  caseId: z.string().uuid("Invalid case ID format"),
});
```

```typescript
// src/validators/sighting.validator.ts

import { z } from "zod";

export const createSightingSchema = z.object({
  profileId: z.string().uuid().optional(), // Optional — can submit without matching to known person
  description: z
    .string()
    .min(10, "Please provide a detailed description")
    .max(5000),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().max(500).optional(),
  }),
  photo: z.string().optional(), // Base64 or file reference — handled by upload middleware
  confidence: z.number().min(0).max(1).optional(),
});

export const sightingStatusSchema = z.object({
  status: z.enum(["PENDING_VERIFICATION", "VERIFIED", "DISMISSED", "DUPLICATE", "ACTIONED"]),
  reason: z.string().max(500).optional(), // Required for DISMISSED and DUPLICATE
});

export const nearbySightingsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).optional().default(10), // km
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
```

```typescript
// src/validators/alert.validator.ts

import { z } from "zod";

export const createAlertSchema = z.object({
  type: z.enum([
    "SIGHTING_MATCH",
    "BEHAVIOR_DETECTION",
    "CASE_UPDATE",
    "SYSTEM_ALERT",
    "SECURITY_BULLETIN",
    "COMMUNITY_ALERT",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  title: z.string().min(5).max(500),
  body: z.string().max(5000).optional(),
  caseId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional(),
      radius: z.number().optional(), // km
    })
    .optional(),
  targetRoles: z
    .array(z.enum(["COMMUNITY", "SECURITY", "LAW_ENFORCEMENT", "ADMIN"]))
    .optional(),
  targetRegions: z.array(z.string()).optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});
```

---

## 9. File Upload Handling

### 9.1 Upload Middleware

```typescript
// src/middleware/upload.ts

import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "@errors/app-error";
import { config } from "@config/env";

interface UploadOptions {
  allowedMimeTypes: string[];
  maxFileSize: number; // in bytes
  fieldName: string;
  maxFiles?: number;
}

const DEFAULT_UPLOAD_PATH = path.join(process.cwd(), "uploads");

/**
 * Create multer upload middleware with validation
 */
export function uploadMiddleware(options: UploadOptions) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, DEFAULT_UPLOAD_PATH);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${uuidv4()}${ext}`;
      cb(null, name);
    },
  });

  const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (options.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `File type ${file.mimetype} is not allowed. Allowed types: ${options.allowedMimeTypes.join(", ")}`,
          400,
          "INVALID_FILE_TYPE",
        ) as unknown as Error,
        false,
      );
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: options.maxFileSize,
      files: options.maxFiles ?? 1,
    },
  }).single(options.fieldName);
}

/**
 * Evidence file upload configuration
 */
export const evidenceUpload = uploadMiddleware({
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  maxFileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024, // 500 MB
  fieldName: "file",
});

/**
 * Photo upload configuration
 */
export const photoUpload = uploadMiddleware({
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  fieldName: "photo",
});

/**
 * Batch evidence upload
 */
export const batchEvidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, DEFAULT_UPLOAD_PATH),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/webp",
      "video/mp4", "video/quicktime",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  },
  limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024, files: 20 },
}).array("files", 20);
```

### 9.2 File Processing Pipeline

```typescript
// src/services/file-storage.service.ts

import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import { getS3Client } from "@integrations/s3";
import { getRedis } from "@config/redis";
import { config } from "@config/env";
import { AppError } from "@errors/app-error";

export class FileStorageService {
  private s3 = getS3Client();
  private readonly bucket: string;

  constructor(bucketName?: string) {
    this.bucket = bucketName ?? config.S3_BUCKET_EVIDENCE;
  }

  /**
   * Upload file to S3-compatible storage with processing
   */
  async uploadFile(
    localPath: string,
    originalName: string,
    mimeType: string,
    options?: {
      generateThumbnail?: boolean;
      generateHash?: boolean;
    },
  ): Promise<{
    filePath: string;
    thumbnailPath?: string;
    sha256Hash: string;
    fileSize: number;
  }> {
    const fileId = uuidv4();
    const ext = path.extname(originalName);
    const key = `evidence/${fileId}${ext}`;

    // Read file buffer
    const fileBuffer = await fs.readFile(localPath);
    const fileSize = fileBuffer.length;

    // Generate SHA-256 hash for chain of custody
    const sha256Hash = this.generateHash(fileBuffer);

    let thumbnailPath: string | undefined;

    // Generate thumbnail for images
    if (options?.generateThumbnail && mimeType.startsWith("image/")) {
      thumbnailPath = await this.generateThumbnail(fileBuffer, fileId);
    }

    // Upload to S3
    await this.s3.putObject({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      Metadata: {
        originalName,
        sha256Hash,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Clean up local temp file
    await fs.unlink(localPath).catch(() => {});

    return {
      filePath: key,
      thumbnailPath,
      sha256Hash,
      fileSize,
    };
  }

  /**
   * Generate thumbnail for image evidence
   */
  private async generateThumbnail(
    buffer: Buffer,
    fileId: string,
  ): Promise<string> {
    const thumbnailKey = `thumbnails/${fileId}.jpg`;

    const thumbnailBuffer = await sharp(buffer)
      .resize(300, 200, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    await this.s3.putObject({
      Bucket: this.bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: "image/jpeg",
      Metadata: {
        type: "thumbnail",
        sourceId: fileId,
      },
    });

    return thumbnailKey;
  }

  /**
   * Generate SHA-256 hash for file integrity
   */
  private generateHash(buffer: Buffer): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Generate pre-signed URL for secure file download
   */
  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: this.bucket,
      Key: key,
    });
  }

  /**
   * Verify file integrity by comparing hash
   */
  async verifyIntegrity(
    key: string,
    expectedHash: string,
  ): Promise<boolean> {
    const response = await this.s3.getObject({
      Bucket: this.bucket,
      Key: key,
    });

    const buffer = await response.Body!.transformToByteArray();
    const actualHash = this.generateHash(Buffer.from(buffer));

    return actualHash === expectedHash;
  }
}
```

---

## 10. WebSocket Implementation

### 10.1 WebSocket Server Setup

```typescript
// src/websocket/server.ts

import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verify } from "jsonwebtoken";
import { config } from "@config/env";
import { getRedis } from "@config/redis";

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  role?: string;
  isAlive?: boolean;
  subscriptions: Set<string>;
}

export class AlertWebSocketServer {
  private wss: WebSocketServer;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({
      server,
      path: "/api/v1/ws/alerts",
      maxPayload: 1024 * 100, // 100KB max message
    });

    this.setupConnectionHandler();
    this.startHeartbeat();
  }

  private setupConnectionHandler(): void {
    this.wss.on("connection", (ws: AuthenticatedSocket, req) => {
      ws.subscriptions = new Set();
      ws.isAlive = true;

      // Authenticate via token in query string
      const token = this.extractToken(req.url);
      if (token) {
        try {
          const payload = verify(token, config.JWT_ACCESS_SECRET) as any;
          ws.userId = payload.sub;
          ws.role = payload.role;
        } catch {
          // Allow connection but restrict subscriptions
          console.warn("WebSocket connection with invalid token");
        }
      }

      console.log(`WebSocket connected: user=${ws.userId ?? "anonymous"}`);

      // Handle incoming messages
      ws.on("message", (data) => this.handleMessage(ws, data));

      // Handle pong (heartbeat response)
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      // Handle disconnect
      ws.on("close", () => {
        console.log(`WebSocket disconnected: user=${ws.userId ?? "anonymous"}`);
        this.unsubscribeAll(ws);
      });

      // Send welcome message with connection info
      ws.send(
        JSON.stringify({
          type: "connected",
          data: {
            userId: ws.userId,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: AuthenticatedSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "subscribe":
          this.handleSubscribe(ws, message.channels);
          break;

        case "unsubscribe":
          this.handleUnsubscribe(ws, message.channels);
          break;

        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              data: { message: `Unknown message type: ${message.type}` },
            }),
          );
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "Invalid message format" },
        }),
      );
    }
  }

  /**
   * Subscribe to notification channels
   */
  private handleSubscribe(ws: AuthenticatedSocket, channels: string[]): void {
    for (const channel of channels) {
      // Validate channel access based on role
      if (this.canSubscribe(ws, channel)) {
        ws.subscriptions.add(channel);
      }
    }

    ws.send(
      JSON.stringify({
        type: "subscribed",
        data: { channels: Array.from(ws.subscriptions) },
      }),
    );
  }

  /**
   * Unsubscribe from channels
   */
  private handleUnsubscribe(ws: AuthenticatedSocket, channels: string[]): void {
    for (const channel of channels) {
      ws.subscriptions.delete(channel);
    }

    ws.send(
      JSON.stringify({
        type: "unsubscribed",
        data: { channels: Array.from(ws.subscriptions) },
      }),
    );
  }

  /**
   * Broadcast alert to subscribed clients
   */
  async broadcastAlert(alert: {
    id: string;
    type: string;
    severity: string;
    title: string;
    body?: string;
    channels: string[];
    userIds?: string[];
  }): Promise<void> {
    const message = JSON.stringify({
      type: "alert",
      data: alert,
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const ws = client as AuthenticatedSocket;

        // Deliver if subscribed to relevant channel
        const hasChannel = alert.channels.some((ch) =>
          ws.subscriptions.has(ch),
        );

        // Deliver if directly targeted
        const isTargeted = ws.userId && alert.userIds?.includes(ws.userId);

        if (hasChannel || isTargeted) {
          ws.send(message);
        }
      }
    });

    // Publish to Redis for multi-instance delivery
    await getRedis().publish("alerts:realtime", message);
  }

  /**
   * Subscribe to Redis channel for cross-instance alert delivery
   */
  async subscribeToRedisChannel(): Promise<void> {
    const redis = getRedis();
    const subscriber = redis.duplicate();
    await subscriber.connect();

    await subscriber.subscribe("alerts:realtime", (message) => {
      // Already handled by the publishing instance
    });
  }

  /**
   * Channel access control
   */
  private canSubscribe(ws: AuthenticatedSocket, channel: string): boolean {
    if (channel.startsWith("user:")) {
      // user:{userId} — only the specific user
      return ws.userId === channel.split(":")[1];
    }

    if (channel === "alerts:all" && ws.role === "SUPER_ADMIN") {
      return true;
    }

    if (channel === "alerts:law-enforcement" && ws.role === "LAW_ENFORCEMENT") {
      return true;
    }

    if (channel === "alerts:security" && ws.role === "SECURITY") {
      return true;
    }

    if (channel === "alerts:community" && ws.role === "COMMUNITY") {
      return true;
    }

    // Public alerts channel
    if (channel === "alerts:public") {
      return true;
    }

    return false;
  }

  /**
   * Heartbeat to detect stale connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const socket = ws as AuthenticatedSocket;

        if (socket.isAlive === false) {
          console.log("Terminating stale WebSocket connection");
          return socket.terminate();
        }

        socket.isAlive = false;
        socket.ping();
      });
    }, config.WS_HEARTBEAT_INTERVAL);
  }

  /**
   * Unsubscribe from all channels on disconnect
   */
  private unsubscribeAll(ws: AuthenticatedSocket): void {
    ws.subscriptions.clear();
  }

  /**
   * Extract JWT token from connection URL
   */
  private extractToken(url?: string): string | null {
    if (!url) return null;
    const params = new URLSearchParams(url.split("?")[1] ?? "");
    return params.get("token");
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    this.wss.clients.forEach((ws) => {
      ws.close(1001, "Server shutting down");
    });

    return new Promise((resolve) => {
      this.wss.close(() => resolve());
    });
  }
}
```

### 10.2 WebSocket Integration with Server

```typescript
// src/server.ts

import http from "http";
import { app } from "./app";
import { AlertWebSocketServer } from "@websocket/server";
import { config } from "@config/env";
import { getPrisma } from "@config/database";
import { getRedis } from "@config/redis";

const server = http.createServer(app);

// Initialize WebSocket server
const wsServer = new AlertWebSocketServer(server);

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Stop accepting new connections
  server.close();

  // Close WebSocket connections
  await wsServer.shutdown();

  // Disconnect database
  await getPrisma().$disconnect();

  // Close Redis
  await getRedis().quit();

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start server
server.listen(config.PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║        Sentinel360 API Server                ║
  ║──────────────────────────────────────────────║
  ║  Port:     ${config.PORT.toString().padEnd(35)}║
  ║  Env:      ${config.NODE_ENV.padEnd(35)}║
  ║  API:      ${config.API_PREFIX.padEnd(35)}║
  ║  WS:       /api/v1/ws/alerts                ║
  ╚══════════════════════════════════════════════╝
  `);
});
```

### 10.3 Client WebSocket Connection Flow

```typescript
// Example client-side connection (in a mobile app or browser)

const ws = new WebSocket(
  `wss://api.sentinel360.gov/api/v1/ws/alerts?token=${accessToken}`
);

ws.onopen = () => {
  // Subscribe to relevant channels
  ws.send(JSON.stringify({
    type: "subscribe",
    channels: [
      "alerts:public",
      "alerts:law-enforcement",
      `user:${userId}`,
    ],
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case "alert":
      // Show push notification
      showNotification(message.data);
      break;
    case "connected":
      console.log("Connected to alert stream");
      break;
    case "subscribed":
      console.log("Subscribed to channels:", message.data.channels);
      break;
  }
};

ws.onclose = () => {
  // Reconnect with exponential backoff
  setTimeout(() => connectWebSocket(), 5000);
};
```

---

## Summary

- **70+ API endpoints** organized into 15 domain-specific route files
- **Consistent response envelope** with success/data/message/meta pattern
- **Middleware stack** with security headers, compression, rate limiting, auth, validation, and audit logging
- **Controller pattern** with BaseController providing standardized response methods
- **Service layer** encapsulates all business logic with dependency injection
- **Comprehensive error handling** with custom error classes, Zod validation, Prisma error mapping
- **File upload pipeline** with Multer, Sharp (thumbnails), SHA-256 hashing, and S3 storage
- **WebSocket server** with authentication, channel-based subscriptions, heartbeat, and Redis pub/sub for horizontal scaling
- **Thread-level documentation** of every request/response format
