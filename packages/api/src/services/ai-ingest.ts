import { db } from "@Sentinel360/db";
import { alert, notification } from "@Sentinel360/db/schema/alerts";
import { user } from "@Sentinel360/db/schema/auth";
import { caseIncident, incident } from "@Sentinel360/db/schema/cases";
import { role, userRole } from "@Sentinel360/db/schema/rbac";
import { eq, inArray } from "drizzle-orm";

import { insertCaseWithGeneratedNumber } from "./case-number";
import { recordCaseEvent } from "./case-timeline";
import { recordAuditEvent } from "./audit-log";

// Event types the apps/ai CCTV pipeline can report. WATCHLIST_MATCH and
// PLATE_MATCH are declared now so the payload shape doesn't need to change
// once face/ALPR matching lands (see tasks #9/#10) — ingestAiEvent already
// handles them, it just has nothing extra to attach to the case yet.
export const AI_EVENT_TYPES = [
  "WEAPON_DETECTED",
  "ALTERCATION",
  "WATCHLIST_MATCH",
  "PLATE_MATCH",
] as const;
export type AiEventType = (typeof AI_EVENT_TYPES)[number];

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const SEVERITY_BY_EVENT_TYPE: Record<AiEventType, Severity> = {
  WEAPON_DETECTED: "CRITICAL",
  ALTERCATION: "HIGH",
  WATCHLIST_MATCH: "HIGH",
  PLATE_MATCH: "MEDIUM",
};

// Roles that should see AI-generated alerts in their inbox. Mirrors the
// role codes routers/alerts.ts#resolveTargetUserIds maps ADMIN/LAW_ENFORCEMENT/
// SECURITY_OPERATOR targetRoles to, minus COMMUNITY (not relevant to an AI
// detection alert).
const AI_ALERT_RECIPIENT_ROLE_CODES = [
  "security_operator",
  "law_enforcement",
  "admin",
  "super_admin",
];

export interface AiEventInput {
  cameraId: string;
  eventType: AiEventType;
  confidence: number;
  occurredAt: Date;
  summary?: string;
  location?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AiEventResult {
  incident: typeof incident.$inferSelect;
  case: Awaited<ReturnType<typeof insertCaseWithGeneratedNumber>>;
  alert: typeof alert.$inferSelect;
}

async function resolveAiAlertRecipientIds(): Promise<string[]> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .innerJoin(userRole, eq(userRole.userId, user.id))
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(inArray(role.code, AI_ALERT_RECIPIENT_ROLE_CODES));

  return [...new Set(rows.map((r) => r.id))];
}

function generateIncidentNumber(): string {
  return `INC-AI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Entry point for apps/ai's POST /internal/ai/events. Writes an incident,
 * auto-opens a case (docket) for it, and raises an alert with notification
 * fan-out — the same shapes routers/cases.ts#create and routers/alerts.ts#create
 * use for human-initiated actions, so the resulting rows are indistinguishable
 * to the rest of the app. actorUserId is null throughout: there is no
 * Supabase session on this path, only a shared-secret-authenticated service.
 * Media capture and face/plate entity linking are deferred to tasks #9/#10 —
 * this only creates the incident/case/alert skeleton for a detection event.
 */
export async function ingestAiEvent(input: AiEventInput): Promise<AiEventResult> {
  const severity = SEVERITY_BY_EVENT_TYPE[input.eventType];
  const title = input.summary ?? `${input.eventType.replace(/_/g, " ")} — camera ${input.cameraId}`;
  const description = `Automatically detected by the AI monitoring pipeline on camera ${input.cameraId} (${(input.confidence * 100).toFixed(0)}% confidence).`;

  const [createdIncident] = await db
    .insert(incident)
    .values({
      incidentNumber: generateIncidentNumber(),
      incidentType: input.eventType,
      title,
      description,
      location: input.location ?? {},
      occurredAt: input.occurredAt,
      severity,
      status: "REPORTED",
      sourceDomain: "ai_pipeline",
      sourceEntityType: "CAMERA",
      sourceEntityId: input.cameraId,
      reportedByUserId: null,
    })
    .returning();
  if (!createdIncident) {
    throw new Error("Incident was not created");
  }

  const createdCase = await insertCaseWithGeneratedNumber({
    caseType: "AI_GENERATED",
    title: `Auto-docket: ${title}`,
    description,
    priority: severity,
    assignedToUserId: null,
    createdByUserId: null,
  });

  await recordCaseEvent({
    caseId: createdCase.id,
    eventType: "CASE_CREATED",
    summary: `Case ${createdCase.caseNumber} auto-opened by AI pipeline: ${createdCase.title}`,
    payload: { caseType: createdCase.caseType, priority: createdCase.priority, source: "ai_pipeline" },
    actorUserId: null,
  });

  await db.insert(caseIncident).values({ caseId: createdCase.id, incidentId: createdIncident.id }).onConflictDoNothing();

  await recordCaseEvent({
    caseId: createdCase.id,
    eventType: "INCIDENT_LINKED",
    summary: `Incident ${createdIncident.incidentNumber} linked to case`,
    payload: { incidentId: createdIncident.id },
    actorUserId: null,
  });

  const [createdAlert] = await db
    .insert(alert)
    .values({
      alertType: input.eventType,
      title,
      message: description,
      severity,
      sourceDomain: "ai_pipeline",
      sourceEntityType: "CASE",
      sourceEntityId: createdCase.id,
      location: input.location ?? {},
      metadata: {
        targetRole: "ALL",
        cameraId: input.cameraId,
        confidence: input.confidence,
        caseId: createdCase.id,
        incidentId: createdIncident.id,
        ...input.metadata,
      },
    })
    .returning();
  if (!createdAlert) {
    throw new Error("Alert was not created");
  }

  const recipientIds = await resolveAiAlertRecipientIds();
  if (recipientIds.length > 0) {
    const now = new Date();
    await db.insert(notification).values(
      recipientIds.map((recipientUserId) => ({
        alertId: createdAlert.id,
        recipientUserId,
        channel: "IN_APP",
        title: createdAlert.title,
        body: createdAlert.message,
        deliveryStatus: "DELIVERED",
        sentAt: now,
        deliveredAt: now,
      })),
    );
  }

  await recordAuditEvent({
    eventType: "ai.event_ingested",
    domain: "ai_pipeline",
    actorId: null,
    targetEntityType: "CASE",
    targetEntityId: createdCase.id,
    action: "CREATE",
    payload: {
      eventType: input.eventType,
      cameraId: input.cameraId,
      confidence: input.confidence,
      incidentId: createdIncident.id,
      alertId: createdAlert.id,
    },
  });

  return { incident: createdIncident, case: createdCase, alert: createdAlert };
}
