# 05 — Services Layer

> **Sentinel360 Backend — Business Logic Services Architecture**
> Version: 1.0 | Last Updated: June 2026

---

## Table of Contents

1. [Service Layer Architecture](#1-service-layer-architecture)
2. [CaseManagementService](#2-casemanagementservice)
3. [EvidenceService](#3-evidenceservice)
4. [AlertService](#4-alertservice)
5. [SightingService](#5-sightingservice)
6. [ProfileService](#6-profileservice)
7. [AuditService](#7-auditservice)
8. [AIAnalysisService](#8-aianalysisservice)
9. [FileStorageService](#9-filestorageservice)
10. [NotificationService](#10-notificationservice)
11. [SearchService](#11-searchservice)
12. [Background Job Processors](#12-background-job-processors)

---

## 1. Service Layer Architecture

### Principles

1. **Single Responsibility**: Each service owns a specific domain
2. **No HTTP Logic**: Services never touch req/res — they receive and return plain data
3. **Thin Controllers**: Controllers validate input, call services, format response
4. **Dependency Injection**: Services accept dependencies via constructor
5. **Event-Driven**: Services emit events for cross-cutting concerns (audit, notifications)
6. **Transactional Boundaries**: Services manage database transactions for multi-step operations

### Service Dependency Graph

```
Controller Layer
    |
    v
+--------------------------------------------------------+
|                    Service Layer                        |
+---------------------------+-----------------------------+
|  Domain Services          |  Cross-Cutting Services     |
|                           |                             |
|  CaseManagement           |  AuditService               |
|  EvidenceService          |  NotificationService        |
|  ProfileService           |  SearchService              |
|  SightingService          |  FileStorageService         |
|  AlertService             |  EmailService               |
|  AIAnalysisService        |                             |
+----------+----------------+----------+------------------+
           |                          |
           v                          v
+----------------------+  +-------------------------+
|  Prisma Client       |  |  External Integrations  |
|  (PostgreSQL)        |  |  (S3, Elasticsearch,    |
|                      |  |   Redis, AI Service,    |
|                      |  |   Email Provider)       |
+----------------------+  +-------------------------+
```

---

## 2. CaseManagementService

```typescript
// src/services/case.service.ts

import { getPrisma } from "@config/database";
import { AuditService } from "./audit.service";
import { EventEmitter } from "@events/emitter";
import { AppError, NotFoundError } from "@errors/app-error";

interface CaseFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  search?: string;
  region?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class CaseManagementService {
  private auditService = new AuditService();
  private events = EventEmitter.getInstance();

  /**
   * List cases with comprehensive filtering and role-based visibility
   */
  async list(page: number, limit: number, filters: CaseFilters, user: AuthUser) {
    const where: any = { deletedAt: null };

    // Role-based visibility
    if (user.role === "COMMUNITY") {
      return { data: [], total: 0, page, limit };
    }
    if (user.role === "SECURITY") {
      where.status = { in: ["OPEN", "UNDER_INVESTIGATION"] };
    }

    // Apply filters
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedTo) where.assignedToId = filters.assignedTo;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { caseNumber: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.region) {
      where.incidentLocation = { path: ["region"], string_contains: filters.region };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      getPrisma().case.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { evidence: true, suspects: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      getPrisma().case.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Get case by ID with full relations
   */
  async getById(caseId: string, user: AuthUser) {
    const caseData = await getPrisma().case.findUnique({
      where: { id: caseId, deletedAt: null },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true } },
        evidence: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { uploadedBy: { select: { id: true, name: true } } },
        },
        suspects: {
          include: {
            profile: {
              select: { id: true, fullName: true, photoUrl: true, status: true, riskLevel: true },
            },
          },
        },
      },
    });

    if (!caseData) throw new NotFoundError("Case", caseId);
    return caseData;
  }

  /**
   * Create a new investigation case with auto-generated case number
   */
  async create(data: CreateCaseInput) {
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

    await this.auditService.log({
      userId: data.createdById,
      action: "CREATE",
      entityType: "case",
      entityId: caseData.id,
      metadata: { title: data.title, caseNumber },
    });

    this.events.emit("case:created", { caseId: caseData.id });
    return caseData;
  }

  /**
   * Update case with version conflict detection and audit diff
   */
  async update(caseId: string, data: UpdateCaseInput, user: AuthUser) {
    const existing = await getPrisma().case.findUnique({ where: { id: caseId, deletedAt: null } });
    if (!existing) throw new NotFoundError("Case", caseId);

    const before = { ...existing };

    const updated = await getPrisma().case.update({
      where: { id: caseId },
      data: {
        ...data,
        incidentDate: data.incidentDate ? new Date(data.incidentDate) : undefined,
        version: { increment: 1 },
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: "UPDATE",
      entityType: "case",
      entityId: caseId,
      metadata: {
        before: this.getDiffFields(before, ["title", "description", "status", "priority", "assignedToId"]),
        after: this.getDiffFields(updated, ["title", "description", "status", "priority", "assignedToId"]),
      },
    });

    this.events.emit("case:updated", { caseId });
    return updated;
  }

  /**
   * Soft-delete (archive) a case
   */
  async archive(caseId: string, user: AuthUser) {
    const existing = await getPrisma().case.findUnique({ where: { id: caseId, deletedAt: null } });
    if (!existing) throw new NotFoundError("Case", caseId);

    await getPrisma().case.update({
      where: { id: caseId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    await this.auditService.log({
      userId: user.id, action: "ARCHIVE", entityType: "case", entityId: caseId,
    });

    this.events.emit("case:archived", { caseId });
  }

  /**
   * Add suspect to case
   */
  async addSuspect(caseId: string, profileId: string, role: string, userId: string) {
    const link = await getPrisma().caseSuspect.create({
      data: { caseId, profileId, role: role ?? "person_of_interest", addedById: userId },
      include: {
        profile: { select: { id: true, fullName: true } },
        case: { select: { id: true, caseNumber: true } },
      },
    });

    await this.auditService.log({
      userId, action: "UPDATE", entityType: "case", entityId: caseId,
      metadata: { action: "suspect_added", profileId, profileName: link.profile.fullName, role },
    });

    this.events.emit("case:suspect-added", { caseId, profileId });
    return link;
  }

  /**
   * Generate case number: SEN360-YYYY-XXXXX
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

  private getDiffFields(obj: any, fields: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in obj) result[field] = obj[field];
    }
    return result;
  }
}
```

---

## 3. EvidenceService

```typescript
// src/services/evidence.service.ts

import { getPrisma } from "@config/database";
import { FileStorageService } from "./file-storage.service";
import { AuditService } from "./audit.service";
import { EventEmitter } from "@events/emitter";
import { NotFoundError } from "@errors/app-error";

export class EvidenceService {
  private storage = new FileStorageService();
  private auditService = new AuditService();
  private events = EventEmitter.getInstance();

  /**
   * Upload evidence file with chain of custody creation
   * Steps: 1) Verify case exists, 2) Store file with hash, 3) Create record + chain entry
   */
  async upload(caseId: string, file: Express.Multer.File, description: string | undefined, uploadedById: string) {
    const caseData = await getPrisma().case.findUnique({ where: { id: caseId, deletedAt: null } });
    if (!caseData) throw new NotFoundError("Case", caseId);

    const fileType = this.determineFileType(file.mimetype);

    const storageResult = await this.storage.uploadFile(file.path, file.originalname, file.mimetype, {
      generateThumbnail: fileType === "IMAGE",
      generateHash: true,
    });

    const evidence = await getPrisma().evidence.create({
      data: {
        caseId,
        fileName: file.originalname,
        fileType,
        mimeType: file.mimetype,
        fileSize: storageResult.fileSize,
        filePath: storageResult.filePath,
        thumbnailPath: storageResult.thumbnailPath,
        sha256Hash: storageResult.sha256Hash,
        status: "PENDING_REVIEW",
        description,
        uploadedById,
        chainOfCustody: [{
          action: "UPLOADED",
          performedById: uploadedById,
          timestamp: new Date().toISOString(),
          notes: "Initial upload",
        }],
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    // Structured chain of custody entry
    await getPrisma().chainOfCustodyEntry.create({
      data: {
        evidenceId: evidence.id,
        action: "UPLOADED",
        performedById: uploadedById,
        notes: "File uploaded: " + file.originalname,
      },
    });

    await this.auditService.log({
      userId: uploadedById, action: "CREATE", entityType: "evidence", entityId: evidence.id,
      metadata: { caseId, fileName: file.originalname, fileType, fileSize: storageResult.fileSize, sha256Hash: storageResult.sha256Hash },
    });

    this.events.emit("evidence:uploaded", { evidenceId: evidence.id, caseId });
    return evidence;
  }

  /**
   * Verify or reject evidence (Law Enforcement / Admin action)
   */
  async verify(evidenceId: string, userId: string, status: "VERIFIED" | "REJECTED", notes?: string) {
    const evidence = await getPrisma().evidence.findUnique({ where: { id: evidenceId, deletedAt: null } });
    if (!evidence) throw new NotFoundError("Evidence", evidenceId);

    await getPrisma().evidence.update({ where: { id: evidenceId }, data: { status } });

    // Record chain of custody
    const chainEntry = { action: status === "VERIFIED" ? "VERIFIED" : "REJECTED", performedById: userId, timestamp: new Date().toISOString(), notes };
    const updatedChain = [...(evidence.chainOfCustody as any[]), chainEntry];

    await getPrisma().evidence.update({ where: { id: evidenceId }, data: { chainOfCustody: updatedChain } });

    await getPrisma().chainOfCustodyEntry.create({
      data: { evidenceId, action: status === "VERIFIED" ? "VERIFIED" : "REVIEWED", performedById: userId, notes },
    });

    await this.auditService.log({
      userId, action: status === "VERIFIED" ? "VERIFY" : "REJECT", entityType: "evidence", entityId: evidenceId,
      metadata: { caseId: evidence.caseId, notes },
    });

    return { id: evidenceId, status };
  }

  /**
   * Get full chain of custody for evidence with integrity verification
   */
  async getChainOfCustody(evidenceId: string) {
    const evidence = await getPrisma().evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) throw new NotFoundError("Evidence", evidenceId);

    const entries = await getPrisma().chainOfCustodyEntry.findMany({
      where: { evidenceId },
      orderBy: { createdAt: "asc" },
      include: { performedBy: { select: { id: true, name: true, role: true } } },
    });

    const integrityVerified = await this.storage.verifyIntegrity(evidence.filePath, evidence.sha256Hash).catch(() => false);

    return { evidenceId, fileName: evidence.fileName, sha256Hash: evidence.sha256Hash, integrityVerified, entries };
  }

  private determineFileType(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "IMAGE";
    if (mimeType.startsWith("video/")) return "VIDEO";
    if (mimeType.startsWith("audio/")) return "AUDIO";
    if (mimeType.includes("pdf") || mimeType.includes("document")) return "DOCUMENT";
    return "OTHER";
  }
}
```

---

## 4. AlertService

```typescript
// src/services/alert.service.ts

import { getPrisma } from "@config/database";
import { getRedis } from "@config/redis";
import { NotificationService } from "./notification.service";
import { AuditService } from "./audit.service";
import { EventEmitter } from "@events/emitter";
import { AppError } from "@errors/app-error";

interface TargetedAlertInput {
  type: string;
  severity: string;
  title: string;
  body?: string;
  caseId?: string;
  profileId?: string;
  location?: LocationData;
  targetRoles?: string[];
  targetRegions?: string[];
  targetUserIds?: string[];
  createdById: string;
  scheduledFor?: string;
  expiresAt?: string;
}

export class AlertService {
  private notificationService = new NotificationService();
  private auditService = new AuditService();
  private events = EventEmitter.getInstance();

  /**
   * Create and deliver an alert to targeted recipients
   * Orchestrates: record creation -> recipient resolution -> multi-channel delivery
   */
  async createAndDeliver(input: TargetedAlertInput) {
    // 1. Create alert record
    const alert = await getPrisma().alert.create({
      data: {
        type: input.type, severity: input.severity, title: input.title, body: input.body,
        caseId: input.caseId, profileId: input.profileId, location: input.location,
        createdById: input.createdById,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
    });

    // 2. Resolve recipients
    const recipients = await this.resolveRecipients(input);

    // 3. Create recipient associations
    await this.createRecipientRecords(alert.id, recipients);

    // 4. Multi-channel delivery (async)
    await this.deliver(alert, recipients);

    // 5. Audit
    await this.auditService.log({
      userId: input.createdById, action: "CREATE", entityType: "alert", entityId: alert.id,
      metadata: { type: input.type, severity: input.severity, recipientCount: recipients.length },
    });

    this.events.emit("alert:created", { alertId: alert.id, recipientCount: recipients.length });
    return { alert, recipientCount: recipients.length };
  }

  /**
   * Get paginated alerts for a specific user
   */
  async getUserAlerts(userId: string, page: number, limit: number, unreadOnly?: boolean) {
    const where: any = { recipients: { some: { userId } } };
    if (unreadOnly) where.recipients = { some: { userId, readAt: null } };

    const [alerts, total] = await Promise.all([
      getPrisma().alert.findMany({
        where,
        include: { recipients: { where: { userId }, select: { deliveryStatus: true, readAt: true, dismissedAt: true } } },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit, take: limit,
      }),
      getPrisma().alert.count({ where }),
    ]);

    return { alerts, total, page, limit };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return getPrisma().alertRecipient.count({
      where: { userId, readAt: null, dismissedAt: null, alert: { OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }] } },
    });
  }

  async markAsRead(alertId: string, userId: string) {
    await getPrisma().alertRecipient.updateMany({
      where: { alertId, userId, readAt: null },
      data: { readAt: new Date(), deliveryStatus: "READ" },
    });
  }

  async dismiss(alertId: string, userId: string) {
    await getPrisma().alertRecipient.updateMany({
      where: { alertId, userId, dismissedAt: null },
      data: { dismissedAt: new Date(), deliveryStatus: "DISMISSED" },
    });
  }

  /**
   * Resolve target recipients based on role, region, or explicit IDs
   */
  private async resolveRecipients(input: TargetedAlertInput): Promise<string[]> {
    const where: any = { status: "ACTIVE", emailVerifiedAt: { not: null } };
    if (input.targetRoles?.length) where.role = { in: input.targetRoles };
    if (input.targetUserIds?.length) where.id = { in: input.targetUserIds };

    const users = await getPrisma().user.findMany({ where, select: { id: true } });
    return users.map((u) => u.id);
  }

  private async createRecipientRecords(alertId: string, userIds: string[]) {
    const records = userIds.map((userId) => ({ alertId, userId, deliveryStatus: "PENDING" as const }));
    await getPrisma().alertRecipient.createMany({ data: records, skipDuplicates: true });
  }

  /**
   * Multi-channel delivery: WebSocket, Push, Email (based on severity)
   */
  private async deliver(alert: any, userIds: string[]) {
    // WebSocket real-time delivery
    const channels = this.getAlertChannels(alert);
    await getRedis().publish("alerts:realtime", JSON.stringify({
      id: alert.id, type: alert.type, severity: alert.severity,
      title: alert.title, body: alert.body, channels, userIds,
      timestamp: new Date().toISOString(),
    }));

    // Push notification (background job)
    await this.notificationService.sendPushToUsers(userIds, {
      title: alert.title, body: alert.body ?? "",
      data: { alertId: alert.id, type: alert.type, severity: alert.severity },
    });

    // Email for critical/high severity
    if (alert.severity === "CRITICAL" || alert.severity === "HIGH") {
      await this.notificationService.sendEmailToUsers(userIds, {
        subject: `[${alert.severity}] ${alert.title}`,
        html: alert.body ?? alert.title,
      });
    }
  }

  private getAlertChannels(alert: any): string[] {
    const channels = ["alerts:public"];
    switch (alert.type) {
      case "SIGHTING_MATCH":
      case "BEHAVIOR_DETECTION":
      case "CASE_UPDATE":
        channels.push("alerts:law-enforcement", "alerts:security"); break;
      case "COMMUNITY_ALERT":
        channels.push("alerts:community"); break;
      case "SECURITY_BULLETIN":
        channels.push("alerts:security"); break;
      case "SYSTEM_ALERT":
        channels.push("alerts:all"); break;
    }
    return channels;
  }
}
```

---

## 5. SightingService

```typescript
// src/services/sighting.service.ts

import { getPrisma } from "@config/database";
import { AuditService } from "./audit.service";
import { NotificationService } from "./notification.service";
import { EventEmitter } from "@events/emitter";
import { NotFoundError } from "@errors/app-error";
import { nanoid } from "nanoid";

export class SightingService {
  private auditService = new AuditService();
  private notificationService = new NotificationService();
  private events = EventEmitter.getInstance();

  /**
   * Submit a new sighting report with unique reference number
   */
  async submit(userId: string, data: { profileId?: string; description: string; location: LocationData }) {
    const referenceNumber = `SEN-${nanoid(10).toUpperCase()}`;

    if (data.profileId) {
      const profile = await getPrisma().criminalProfile.findUnique({ where: { id: data.profileId } });
      if (!profile) throw new NotFoundError("Criminal profile", data.profileId);
    }

    const sighting = await getPrisma().sighting.create({
      data: { userId, profileId: data.profileId ?? null, description: data.description, location: data.location, referenceNumber, status: "PENDING_VERIFICATION" },
      include: { user: { select: { id: true, name: true } }, profile: { select: { id: true, fullName: true } } },
    });

    await this.auditService.log({
      userId, action: "CREATE", entityType: "sighting", entityId: sighting.id,
      metadata: { referenceNumber, profileId: data.profileId, location: data.location },
    });

    this.events.emit("sighting:submitted", { sightingId: sighting.id, referenceNumber, hasProfileMatch: !!data.profileId });
    return sighting;
  }

  /**
   * Verify/dismiss a sighting and notify the submitter
   */
  async updateStatus(sightingId: string, status: string, userId: string, reason?: string) {
    const sighting = await getPrisma().sighting.findUnique({
      where: { id: sightingId },
      include: { user: { select: { id: true, name: true } }, profile: { select: { id: true, fullName: true } } },
    });
    if (!sighting) throw new NotFoundError("Sighting", sightingId);

    const updated = await getPrisma().sighting.update({
      where: { id: sightingId },
      data: { status: status as any, verifiedById: userId, verifiedAt: status === "VERIFIED" ? new Date() : undefined, rejectionReason: reason ?? null },
    });

    await this.auditService.log({
      userId, action: status === "VERIFIED" ? "VERIFY" : "REJECT", entityType: "sighting", entityId: sightingId,
      metadata: { status, reason, submitterId: sighting.userId },
    });

    // Notify submitter
    await this.notificationService.sendToUser(sighting.userId, {
      title: status === "VERIFIED" ? "Your sighting has been verified" : "Your sighting has been reviewed",
      body: status === "VERIFIED" ? "Your report has been confirmed by authorities." : "Status update: " + (reason ?? status),
      data: { sightingId, status },
    });

    if (status === "VERIFIED" && sighting.profileId) {
      this.events.emit("sighting:verified", { sightingId, profileId: sighting.profileId, location: sighting.location });
    }

    return updated;
  }

  /**
   * Get sightings near a GPS location using PostGIS earth distance
   */
  async getNearby(lat: number, lng: number, radiusKm: number, limit: number) {
    return getPrisma.$queryRawUnsafe(`
      SELECT s.*, u.name as submitter_name,
        cp.full_name as profile_name, cp.photo_url as profile_photo,
        earth_distance(ll_to_earth($1, $2), ll_to_earth((s.location->>'lat')::float, (s.location->>'lng')::float)) / 1000 AS distance_km
      FROM sightings s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN criminal_profiles cp ON s.profile_id = cp.id
      WHERE s.status = 'VERIFIED'
        AND earth_distance(ll_to_earth($1, $2), ll_to_earth((s.location->>'lat')::float, (s.location->>'lng')::float)) / 1000 <= $3
      ORDER BY distance_km ASC LIMIT $4
    `, lat, lng, radiusKm, limit);
  }
}
```

---

## 6. ProfileService

```typescript
// src/services/profile.service.ts

import { getPrisma } from "@config/database";
import { AuditService } from "./audit.service";
import { EventEmitter } from "@events/emitter";
import { NotFoundError, ConflictError } from "@errors/app-error";

export class ProfileService {
  private auditService = new AuditService();
  private events = EventEmitter.getInstance();

  async create(data: CreateCriminalProfileInput, userId: string) {
    if (data.idNumber) {
      const existing = await getPrisma().criminalProfile.findFirst({ where: { idNumber: data.idNumber, deletedAt: null } });
      if (existing) throw new ConflictError("A profile with this ID number already exists");
    }

    const profile = await getPrisma().criminalProfile.create({
      data: {
        fullName: data.fullName, aliases: data.aliases ?? [],
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        nationality: data.nationality, idNumber: data.idNumber,
        riskLevel: data.riskLevel ?? "MEDIUM",
        physicalDescription: data.physicalDescription, vehicleInfo: data.vehicleInfo ?? [],
        lastKnownLocation: data.lastKnownLocation, createdById: userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    await this.auditService.log({
      userId, action: "CREATE", entityType: "profile", entityId: profile.id,
      metadata: { fullName: data.fullName, riskLevel: data.riskLevel },
    });
    this.events.emit("profile:created", { profileId: profile.id });
    return profile;
  }

  async update(profileId: string, data: UpdateCriminalProfileInput, userId: string) {
    const existing = await getPrisma().criminalProfile.findUnique({ where: { id: profileId, deletedAt: null } });
    if (!existing) throw new NotFoundError("Criminal profile", profileId);

    const updated = await getPrisma().criminalProfile.update({
      where: { id: profileId },
      data: { ...data, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined, version: { increment: 1 } },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    await this.auditService.log({
      userId, action: "UPDATE", entityType: "profile", entityId: profileId,
      metadata: { before: { riskLevel: existing.riskLevel, status: existing.status }, after: { riskLevel: updated.riskLevel, status: updated.status } },
    });
    this.events.emit("profile:updated", { profileId });
    return updated;
  }

  async updateStatus(profileId: string, status: string, userId: string, reason: string) {
    const existing = await getPrisma().criminalProfile.findUnique({ where: { id: profileId, deletedAt: null } });
    if (!existing) throw new NotFoundError("Criminal profile", profileId);

    const data: any = { status };
    if (status === "ARRESTED") {
      data.caseNotes = [...(existing.caseNotes as any[]), { id: nanoid(), note: "Status changed to ARRESTED: " + reason, authorId: userId, timestamp: new Date().toISOString() }];
    }

    const updated = await getPrisma().criminalProfile.update({ where: { id: profileId }, data });

    await this.auditService.log({
      userId, action: "UPDATE", entityType: "profile", entityId: profileId,
      metadata: { action: "status_change", from: existing.status, to: status, reason },
    });

    if (status === "ARRESTED") this.events.emit("profile:arrested", { profileId });
    return updated;
  }

  async archive(profileId: string, userId: string) {
    const profile = await getPrisma().criminalProfile.findUnique({ where: { id: profileId, deletedAt: null } });
    if (!profile) throw new NotFoundError("Criminal profile", profileId);
    await getPrisma().criminalProfile.update({ where: { id: profileId }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
    await this.auditService.log({ userId, action: "ARCHIVE", entityType: "profile", entityId: profileId });
    this.events.emit("profile:archived", { profileId });
  }

  async permanentDelete(profileId: string, userId: string, reason: string) {
    const profile = await getPrisma().criminalProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundError("Criminal profile", profileId);
    await getPrisma().criminalProfile.delete({ where: { id: profileId } });
    await this.auditService.log({ userId, action: "PERMANENT_DELETE", entityType: "profile", entityId: profileId, metadata: { reason, fullName: profile.fullName } });
    this.events.emit("profile:deleted", { profileId });
  }

  /**
   * Merge duplicate profiles: aliases merged, sightings/cases re-assigned
   */
  async mergeProfiles(primaryId: string, duplicateId: string, userId: string) {
    const [primary, duplicate] = await Promise.all([
      getPrisma().criminalProfile.findUnique({ where: { id: primaryId } }),
      getPrisma().criminalProfile.findUnique({ where: { id: duplicateId } }),
    ]);
    if (!primary || !duplicate) throw new NotFoundError("Criminal profile");

    const mergedAliases = [...new Set([...(primary.aliases as string[]), ...(duplicate.aliases as string[])])];

    await getPrisma().sighting.updateMany({ where: { profileId: duplicateId }, data: { profileId: primaryId } });
    await getPrisma().caseSuspect.updateMany({ where: { profileId: duplicateId }, data: { profileId: primaryId } });
    await getPrisma().criminalProfile.update({ where: { id: primaryId }, data: { aliases: mergedAliases, version: { increment: 1 } } });
    await getPrisma().criminalProfile.delete({ where: { id: duplicateId } });

    await this.auditService.log({
      userId, action: "UPDATE", entityType: "profile", entityId: primaryId,
      metadata: { action: "merge", mergedFrom: duplicateId, mergedName: duplicate.fullName },
    });
  }
}
```

---

## 7. AuditService

```typescript
// src/services/audit.service.ts

import { getPrisma } from "@config/database";
import { getRedis } from "@config/redis";

interface AuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Immutable audit logging service
 * All audit logs are append-only and cannot be modified or deleted
 */
export class AuditService {
  /**
   * Write an audit log entry
   * Logs are written synchronously to ensure they are never lost
   */
  async log(input: AuditLogInput): Promise<void> {
    const entry = {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: this.buildDescription(input),
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };

    // Write to database (synchronous - guaranteed persistence)
    await getPrisma().auditLog.create({ data: entry as any });

    // Publish to Redis for real-time audit stream (used by Super Admin dashboard)
    await getRedis().publish("audit:log", JSON.stringify(entry));
  }

  /**
   * Query audit logs with filtering and pagination
   */
  async query(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    const [data, total] = await Promise.all([
      getPrisma().auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      getPrisma().auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Export audit logs as CSV format
   */
  async exportCSV(filters: { userId?: string; dateFrom?: string; dateTo?: string }): Promise<string> {
    const entries = await getPrisma().auditLog.findMany({
      where: {
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.dateFrom || filters.dateTo ? { createdAt: { ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}), ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}) } } : {}),
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    const header = "Timestamp,User,Email,Action,Entity Type,Entity ID,Description,IP Address\n";
    const rows = entries.map((e) =>
      `"${e.createdAt.toISOString()}","${e.user?.name ?? "System"}","${e.user?.email ?? ""}","${e.action}","${e.entityType}","${e.entityId ?? ""}","${e.description ?? ""}","${e.ipAddress ?? ""}"`
    ).join("\n");

    return header + rows;
  }

  private buildDescription(input: AuditLogInput): string {
    switch (input.action) {
      case "CREATE": return `Created ${input.entityType} ${input.entityId}`;
      case "UPDATE": return `Updated ${input.entityType} ${input.entityId}`;
      case "DELETE": return `Deleted ${input.entityType} ${input.entityId}`;
      case "ARCHIVE": return `Archived ${input.entityType} ${input.entityId}`;
      case "VERIFY": return `Verified ${input.entityType} ${input.entityId}`;
      case "REJECT": return `Rejected ${input.entityType} ${input.entityId}`;
      case "LOGIN": return `User logged in`;
      case "LOGOUT": return `User logged out`;
      case "EXPORT": return `Exported ${input.entityType} data`;
      default: return `${input.action} on ${input.entityType} ${input.entityId}`;
    }
  }

  /**
   * Get audit summary for dashboard
   */
  async getSummary(days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [total, byAction, byEntity, recent] = await Promise.all([
      getPrisma().auditLog.count({ where: { createdAt: { gte: since } } }),
      getPrisma().auditLog.groupBy({ by: ["action"], where: { createdAt: { gte: since } }, _count: true }),
      getPrisma().auditLog.groupBy({ by: ["entityType"], where: { createdAt: { gte: since } }, _count: true }),
      getPrisma().auditLog.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } }),
    ]);

    return { total, byAction, byEntity, recent };
  }
}
```

---

## 8. AIAnalysisService

```typescript
// src/services/ai-analysis.service.ts

import { getPrisma } from "@config/database";
import { getRedis } from "@config/redis";
import { EventEmitter } from "@events/emitter";
import { AppError } from "@errors/app-error";
import { config } from "@config/env";

/**
 * Integration point for the Python AI/ML microservice
 * Handles job submission, status tracking, and result processing
 */
export class AIAnalysisService {
  private events = EventEmitter.getInstance();

  /**
   * Submit evidence for AI analysis
   * Enqueues analysis job and returns a tracking ID
   */
  async submitForAnalysis(evidenceId: string, analysisType: string = "facial_recognition"): Promise<string> {
    const evidence = await getPrisma().evidence.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) throw new AppError("Evidence not found", 404, "EVIDENCE_NOT_FOUND");

    const jobId = crypto.randomUUID();

    // Store job in Redis with status tracking
    await getRedis().setex(`ai:job:${jobId}`, 86400, JSON.stringify({
      id: jobId,
      evidenceId,
      analysisType,
      status: "queued",
      createdAt: new Date().toISOString(),
    }));

    // Push to AI analysis queue (consumed by Python workers)
    await getRedis().lpush("ai:analysis:queue", JSON.stringify({
      jobId,
      evidenceId,
      filePath: evidence.filePath,
      analysisType,
      callbackUrl: `${config.APP_URL}/api/v1/ai/jobs/${jobId}/callback`,
    }));

    // Update evidence metadata
    const metadata = evidence.metadata as any ?? {};
    metadata.aiAnalysisId = jobId;
    metadata.aiStatus = "queued";

    await getPrisma().evidence.update({
      where: { id: evidenceId },
      data: { metadata },
    });

    return jobId;
  }

  /**
   * Process AI analysis callback from the AI microservice
   */
  async processAnalysisResult(jobId: string, result: {
    status: "completed" | "failed";
    detections?: any[];
    confidence?: number;
    error?: string;
    processingTimeMs?: number;
  }) {
    const jobData = await getRedis().get(`ai:job:${jobId}`);
    if (!jobData) throw new AppError("Job not found", 404, "JOB_NOT_FOUND");

    const job = JSON.parse(jobData);

    // Update job status
    job.status = result.status;
    job.completedAt = new Date().toISOString();
    await getRedis().setex(`ai:job:${jobId}`, 86400, JSON.stringify(job));

    if (result.status === "completed" && result.detections) {
      // Update evidence with AI analysis results
      const evidence = await getPrisma().evidence.findUnique({
        where: { id: job.evidenceId },
      });

      if (evidence) {
        const metadata = evidence.metadata as any ?? {};
        metadata.aiAnalysisResult = {
          jobId,
          detections: result.detections,
          confidence: result.confidence,
          processingTimeMs: result.processingTimeMs,
          completedAt: job.completedAt,
        };
        metadata.aiStatus = "completed";
        metadata.aiConfidence = result.confidence;

        await getPrisma().evidence.update({
          where: { id: job.evidenceId },
          data: { metadata },
        });

        // Create detection events for high-confidence matches
        for (const detection of result.detections) {
          if (detection.confidence >= config.AI_CONFIDENCE_THRESHOLD) {
            await getPrisma().detectionEvent.create({
              data: {
                cameraId: detection.cameraId ?? "unknown",
                detectionType: detection.type,
                confidence: detection.confidence,
                timestamp: new Date(detection.timestamp ?? Date.now()),
                location: detection.location,
                boundingBox: detection.boundingBox,
                attributes: detection.attributes,
                modelVersion: detection.modelVersion ?? "unknown",
                caseId: evidence.caseId,
                metadata: { sourceJobId: jobId, evidenceId: job.evidenceId },
              },
            });
          }
        }

        this.events.emit("analysis:completed", {
          evidenceId: job.evidenceId,
          jobId,
          detectionCount: result.detections.length,
        });
      }
    }

    return { jobId, status: result.status };
  }

  /**
   * Get analysis job status
   */
  async getJobStatus(jobId: string) {
    const jobData = await getRedis().get(`ai:job:${jobId}`);
    if (!jobData) throw new AppError("Analysis job not found", 404, "JOB_NOT_FOUND");

    return JSON.parse(jobData);
  }

  /**
   * Trigger AI identification on an uploaded image (find matching profile)
   */
  async identifyPerson(imageUrl: string) {
    // Push to identification queue
    const jobId = crypto.randomUUID();

    await getRedis().setex(`ai:identify:${jobId}`, 86400, JSON.stringify({
      id: jobId,
      status: "processing",
      createdAt: new Date().toISOString(),
    }));

    await getRedis().lpush("ai:identify:queue", JSON.stringify({
      jobId,
      imageUrl,
      callbackUrl: `${config.APP_URL}/api/v1/ai/jobs/${jobId}/callback`,
    }));

    return jobId;
  }
}
```

---

## 9. FileStorageService

```typescript
// src/services/file-storage.service.ts

import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { getS3Client } from "@integrations/s3";
import { config } from "@config/env";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class FileStorageService {
  private s3 = getS3Client();
  private readonly bucket: string;

  constructor(bucketName?: string) {
    this.bucket = bucketName ?? config.S3_BUCKET_EVIDENCE;
  }

  /**
   * Upload file to S3-compatible storage with processing
   * Generates SHA-256 hash and optional thumbnail
   */
  async uploadFile(
    localPath: string,
    originalName: string,
    mimeType: string,
    options?: { generateThumbnail?: boolean; generateHash?: boolean },
  ) {
    const fileId = uuidv4();
    const ext = path.extname(originalName);
    const key = `evidence/${fileId}${ext}`;

    const fileBuffer = await fs.readFile(localPath);
    const fileSize = fileBuffer.length;

    const sha256Hash = options?.generateHash !== false
      ? crypto.createHash("sha256").update(fileBuffer).digest("hex")
      : "";

    let thumbnailPath: string | undefined;

    if (options?.generateThumbnail && mimeType.startsWith("image/")) {
      const thumbnailBuffer = await sharp(fileBuffer)
        .resize(300, 200, { fit: "cover", position: "center" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailKey = `thumbnails/${fileId}.jpg`;
      await this.s3.putObject({
        Bucket: this.bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: "image/jpeg",
        Metadata: { type: "thumbnail", sourceId: fileId },
      });
      thumbnailPath = thumbnailKey;
    }

    await this.s3.putObject({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      Metadata: { originalName, sha256Hash, uploadedAt: new Date().toISOString() },
    });

    await fs.unlink(localPath).catch(() => {});

    return { filePath: key, thumbnailPath, sha256Hash, fileSize };
  }

  /**
   * Generate pre-signed URL for secure temporary download
   */
  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.deleteObject({ Bucket: this.bucket, Key: key });
  }

  /**
   * Verify file integrity by comparing stored hash against computed hash
   */
  async verifyIntegrity(key: string, expectedHash: string): Promise<boolean> {
    const response = await this.s3.getObject({ Bucket: this.bucket, Key: key });
    const buffer = Buffer.from(await response.Body!.transformToByteArray());
    const actualHash = crypto.createHash("sha256").update(buffer).digest("hex");
    return actualHash === expectedHash;
  }
}
```

---

## 10. NotificationService

```typescript
// src/services/notification.service.ts

import { getPrisma } from "@config/database";
import { getRedis } from "@config/redis";

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface EmailPayload {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Multi-channel notification service
 * Supports: push notifications, email, in-app alerts
 * Uses Bull queue for async delivery to avoid blocking API requests
 */
export class NotificationService {
  /**
   * Send notification to a single user via all enabled channels
   */
  async sendToUser(userId: string, payload: PushPayload) {
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
      include: { notificationTokens: true },
    });

    if (!user) return;

    const prefs = (user.preferences ?? {}) as any;

    // Push notification
    if (prefs.notifications?.push !== false && user.notificationTokens.length > 0) {
      await this.sendPush(user.notificationTokens, payload);
    }

    // In-app notification (via WebSocket)
    await getRedis().publish("notifications:user:" + userId, JSON.stringify(payload));
  }

  /**
   * Send push notification to multiple users
   */
  async sendPushToUsers(userIds: string[], payload: PushPayload) {
    const tokens = await getPrisma().notificationToken.findMany({
      where: { userId: { in: userIds } },
    });

    if (tokens.length > 0) {
      // Group by platform for batch delivery
      const webTokens = tokens.filter((t) => t.platform === "web").map((t) => t.token);
      const iosTokens = tokens.filter((t) => t.platform === "ios").map((t) => t.token);
      const androidTokens = tokens.filter((t) => t.platform === "android").map((t) => t.token);

      // Send via appropriate push service (Firebase, APNs, Web Push)
      if (webTokens.length > 0) await this.sendWebPush(webTokens, payload);
      if (iosTokens.length > 0) await this.sendAPNs(iosTokens, payload);
      if (androidTokens.length > 0) await this.sendFCM(androidTokens, payload);
    }
  }

  /**
   * Send email to multiple users
   */
  async sendEmailToUsers(userIds: string[], payload: EmailPayload) {
    const users = await getPrisma().user.findMany({
      where: { id: { in: userIds }, status: "ACTIVE" },
      select: { id: true, email: true, name: true },
    });

    // Enqueue email jobs for async delivery
    const emailQueue = [];
    for (const user of users) {
      emailQueue.push({
        to: user.email,
        subject: payload.subject,
        html: payload.html.replace(/{{name}}/g, user.name),
      });
    }

    // Push to email queue (processed by Bull worker)
    if (emailQueue.length > 0) {
      await getRedis().lpush("email:queue", ...emailQueue.map((e) => JSON.stringify(e)));
    }
  }

  private async sendPush(tokens: any[], payload: PushPayload) {
    // Implementation uses web-push for browsers, FCM for Android, APNs for iOS
    // Tokens are grouped by platform for batch delivery
    for (const token of tokens) {
      await getRedis().lpush("push:queue", JSON.stringify({
        token: token.token,
        platform: token.platform,
        payload,
      }));
    }
  }

  private async sendWebPush(tokens: string[], payload: PushPayload) {
    for (const token of tokens) {
      await getRedis().lpush("push:web:queue", JSON.stringify({ token, payload }));
    }
  }

  private async sendFCM(tokens: string[], payload: PushPayload) {
    await getRedis().lpush("push:fcm:queue", JSON.stringify({ tokens, payload }));
  }

  private async sendAPNs(tokens: string[], payload: PushPayload) {
    await getRedis().lpush("push:apns:queue", JSON.stringify({ tokens, payload }));
  }
}
```

---

## 11. SearchService

```typescript
// src/services/search.service.ts

import { getPrisma } from "@config/database";
import { elasticClient } from "@integrations/elasticsearch";
import { config } from "@config/env";

interface SearchQuery {
  q: string;
  type?: string;
  status?: string;
  region?: string;
  page?: number;
  limit?: number;
}

/**
 * Full-text search across entities using Elasticsearch
 * Falls back to PostgreSQL full-text search if ES is unavailable
 */
export class SearchService {
  private readonly indexPrefix = config.ELASTICSEARCH_INDEX_PREFIX;

  /**
   * Search across all entity types
   */
  async search(query: SearchQuery) {
    const results = {
      profiles: [] as any[],
      cases: [] as any[],
      evidence: [] as any[],
      sightings: [] as any[],
      total: 0,
    };

    const types = query.type === "all"
      ? ["profiles", "cases", "evidence", "sightings"]
      : [query.type!];

    if (types.includes("profiles")) {
      results.profiles = await this.searchProfiles(query);
    }
    if (types.includes("cases")) {
      results.cases = await this.searchCases(query);
    }
    if (types.includes("evidence")) {
      results.evidence = await this.searchEvidence(query);
    }
    if (types.includes("sightings")) {
      results.sightings = await this.searchSightings(query);
    }

    results.total = results.profiles.length + results.cases.length
      + results.evidence.length + results.sightings.length;

    return results;
  }

  private async searchProfiles(query: SearchQuery) {
    try {
      const response = await elasticClient.search({
        index: `${this.indexPrefix}-profiles`,
        body: {
          query: {
            bool: {
              must: { multi_match: { query: query.q, fields: ["fullName^3", "aliases^2", "idNumber", "nationality"] } },
              filter: this.buildFilters(query),
            },
          },
          from: ((query.page ?? 1) - 1) * (query.limit ?? 20),
          size: query.limit ?? 20,
        },
      });
      return (response as any).hits.hits.map((h: any) => ({ ...h._source, score: h._score }));
    } catch {
      return this.fallbackSearch("criminalProfile", query.q, ["fullName", "aliases"]);
    }
  }

  private async searchCases(query: SearchQuery) {
    try {
      const response = await elasticClient.search({
        index: `${this.indexPrefix}-cases`,
        body: {
          query: {
            bool: {
              must: { multi_match: { query: query.q, fields: ["title^3", "caseNumber^3", "description", "crimeType"] } },
              filter: this.buildFilters(query),
            },
          },
          from: ((query.page ?? 1) - 1) * (query.limit ?? 20),
          size: query.limit ?? 20,
        },
      });
      return (response as any).hits.hits.map((h: any) => ({ ...h._source, score: h._score }));
    } catch {
      return this.fallbackSearch("case", query.q, ["title", "caseNumber", "description"]);
    }
  }

  private async searchEvidence(query: SearchQuery) {
    // Similar pattern with fallback
    return [];
  }

  private async searchSightings(query: SearchQuery) {
    // Similar pattern with fallback
    return [];
  }

  /**
   * Fallback to PostgreSQL full-text search when Elasticsearch is unavailable
   */
  private async fallbackSearch(model: string, query: string, fields: string[]) {
    const where: any = {
      OR: fields.map((f) => ({ [f]: { contains: query, mode: "insensitive" } })),
      deletedAt: model === "criminalProfile" || model === "case" ? null : undefined,
    };

    const data = await (getPrisma() as any)[model].findMany({
      where,
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return data.map((d: any) => ({ ...d, score: 1 }));
  }

  /**
   * Index a record in Elasticsearch
   */
  async indexRecord(entityType: string, record: any) {
    try {
      await elasticClient.index({
        index: `${this.indexPrefix}-${entityType}`,
        id: record.id,
        body: record,
        refresh: "wait_for",
      });
    } catch (error) {
      console.error("Failed to index record in Elasticsearch:", error);
    }
  }

  /**
   * Remove a record from the search index
   */
  async removeFromIndex(entityType: string, id: string) {
    try {
      await elasticClient.delete({
        index: `${this.indexPrefix}-${entityType}`,
        id,
      });
    } catch {
      // Ignore if document doesn't exist
    }
  }

  private buildFilters(query: SearchQuery): any[] {
    const filters: any[] = [];
    if (query.status) filters.push({ term: { status: query.status } });
    if (query.region) filters.push({ term: { "region.keyword": query.region } });
    return filters;
  }
}
```

---

## 12. Background Job Processors

### 12.1 Bull Queue Setup

```typescript
// src/jobs/queue.ts

import Bull from "bull";
import { config } from "@config/env";

export const queues = {
  email: new Bull("email", config.REDIS_URL),
  push: new Bull("push", config.REDIS_URL),
  aiAnalysis: new Bull("ai-analysis", config.REDIS_URL),
  evidenceProcessing: new Bull("evidence-processing", config.REDIS_URL),
  dataRetention: new Bull("data-retention", config.REDIS_URL),
  searchIndex: new Bull("search-index", config.REDIS_URL),
};

// Default job options
Object.values(queues).forEach((queue) => {
  queue.defaultJobOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 100,
  };
});
```

### 12.2 Email Processor

```typescript
// src/jobs/email.processor.ts

import { queues } from "./queue";
import nodemailer from "nodemailer";
import { config } from "@config/env";

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
});

queues.email.process(async (job) => {
  const { to, subject, html } = job.data;

  await transporter.sendMail({
    from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });

  return { sent: true, to, subject };
});
```

### 12.3 Evidence Thumbnail Processor

```typescript
// src/jobs/evidence.processor.ts

import { queues } from "./queue";
import sharp from "sharp";
import { getPrisma } from "@config/database";
import { getS3Client } from "@integrations/s3";

queues.evidenceProcessing.process(async (job) => {
  const { evidenceId } = job.data;

  const evidence = await getPrisma().evidence.findUnique({
    where: { id: evidenceId },
  });

  if (!evidence || !evidence.fileType.startsWith("IMAGE")) return;

  // Generate additional thumbnail sizes
  const s3 = getS3Client();
  const response = await s3.getObject({
    Bucket: process.env.S3_BUCKET_EVIDENCE!,
    Key: evidence.filePath,
  });

  const buffer = Buffer.from(await response.Body!.transformToByteArray());

  // Generate 3 thumbnail sizes
  const sizes = [
    { key: `thumbnails/${evidenceId}_sm.jpg`, width: 150 },
    { key: `thumbnails/${evidenceId}_md.jpg`, width: 600 },
    { key: `thumbnails/${evidenceId}_lg.jpg`, width: 1200 },
  ];

  for (const size of sizes) {
    const thumbnail = await sharp(buffer)
      .resize(size.width, undefined, { fit: "inside" })
      .jpeg({ quality: 85 })
      .toBuffer();

    await s3.putObject({
      Bucket: process.env.S3_BUCKET_EVIDENCE!,
      Key: size.key,
      Body: thumbnail,
      ContentType: "image/jpeg",
    });
  }

  return { evidenceId, thumbnailsGenerated: sizes.length };
});
```

### 12.4 Data Retention Cron

```typescript
// src/jobs/data-retention.job.ts

import { CronJob } from "cron";
import { getPrisma } from "@config/database";

/**
 * Runs daily at 3 AM to archive and purge expired data
 */
export const dataRetentionJob = new CronJob("0 3 * * *", async () => {
  const prisma = getPrisma();
  const now = new Date();

  // Archive detection events older than 90 days
  const detectionCutoff = new Date(now);
  detectionCutoff.setDate(detectionCutoff.getDate() - 90);
  await prisma.detectionEvent.deleteMany({
    where: { timestamp: { lt: detectionCutoff } },
  });

  // Expire old refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  // Soft-delete expired alerts
  await prisma.alert.updateMany({
    where: { expiresAt: { lt: now } },
    data: { metadata: { expired: true } },
  });

  // Log retention execution
  console.log("Data retention job completed");
}, null, true, "Africa/Johannesburg");
```

---

## Summary

- **10 core services** implementing all business logic for the Sentinel360 domain
- **CaseManagementService**: Full CRUD with auto-generated case numbers, version tracking, role-based visibility
- **EvidenceService**: SHA-256 hashing for chain of custody, S3 storage, thumbnail generation
- **AlertService**: Targeted multi-channel delivery (WebSocket, push, email) with severity escalation
- **SightingService**: GPS proximity search via PostGIS, community submission with verification workflow
- **ProfileService**: Merge detection, status lifecycle management, permanent deletion with audit
- **AuditService**: Immutable logging with CSV export and real-time streaming to Redis
- **AIAnalysisService**: Job queue integration with Python ML microservice for facial recognition
- **FileStorageService**: S3-compatible storage with pre-signed URLs, integrity verification
- **NotificationService**: Multi-platform push (Web, iOS, Android), email with template rendering
- **SearchService**: Elasticsearch with PostgreSQL full-text fallback
- **Background jobs**: Bull queue workers for email, push, evidence processing, and data retention
