import { db } from "@Sentinel360/db";
import { alert } from "@Sentinel360/db/schema/alerts";
import { caseEvidence, caseIncident, incident, investigationCase } from "@Sentinel360/db/schema/cases";
import { mediaAsset } from "@Sentinel360/db/schema/evidence";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import { recordAuditEvent } from "./audit-log";
import { insertCaseWithGeneratedNumber } from "./case-number";
import { recordCaseEvent } from "./case-timeline";
import { EVIDENCE_ENTITY_TYPE } from "./chain-of-custody";

// An AI incident groups repeated detections of one thing on one camera
// (services/ai-ingest.ts). Model detections wait in PENDING_REVIEW until an
// officer opens a docket for them or dismisses them as a false alarm: a
// docket is a formal case, so a person decides. Detections that keep coming
// after the docket is opened are added to it; after a dismissal they start
// a new incident (and a new alert), so a real weapon is never silenced by an
// earlier false alarm. Older AI incidents (before review existed) are
// REPORTED and already have their auto-opened docket.
export const AI_INCIDENT_STATUS = {
  PENDING_REVIEW: "PENDING_REVIEW",
  DOCKETED: "DOCKETED",
  DISMISSED: "DISMISSED",
} as const;

export type AiIncidentRow = typeof incident.$inferSelect;
export type AiCaseRow = typeof investigationCase.$inferSelect;

export class AiReviewError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST",
    message: string,
  ) {
    super(message);
  }
}

export async function findLinkedCase(incidentId: string): Promise<AiCaseRow | null> {
  const [link] = await db
    .select({ caseId: caseIncident.caseId })
    .from(caseIncident)
    .where(eq(caseIncident.incidentId, incidentId))
    .limit(1);
  if (!link) return null;

  const [linkedCase] = await db
    .select()
    .from(investigationCase)
    .where(eq(investigationCase.id, link.caseId))
    .limit(1);
  return linkedCase ?? null;
}

// The incident's alert. Older AI alerts point at their auto-opened case
// instead of the incident; both carry metadata.incidentId.
export async function findIncidentAlert(incidentId: string) {
  const [found] = await db
    .select()
    .from(alert)
    .where(
      and(
        eq(alert.sourceDomain, "ai_pipeline"),
        or(
          and(eq(alert.sourceEntityType, "INCIDENT"), eq(alert.sourceEntityId, incidentId)),
          sql`${alert.metadata}->>'incidentId' = ${incidentId}`,
        ),
      ),
    )
    .limit(1);
  return found ?? null;
}

// Every image the AI attached to this incident, across all its detections.
export async function listIncidentEvidence(incidentId: string) {
  return db
    .select()
    .from(mediaAsset)
    .where(sql`${mediaAsset.metadata}->>'incidentId' = ${incidentId}`)
    .orderBy(asc(mediaAsset.createdAt));
}

async function getAiIncidentOrThrow(incidentId: string): Promise<AiIncidentRow> {
  const [found] = await db.select().from(incident).where(eq(incident.id, incidentId)).limit(1);
  if (!found || found.sourceDomain !== "ai_pipeline") {
    throw new AiReviewError("NOT_FOUND", "AI incident not found");
  }
  return found;
}

async function updateAlertMetadata(incidentId: string, patch: Record<string, unknown>, status?: string) {
  const current = await findIncidentAlert(incidentId);
  if (!current) return null;
  const [updated] = await db
    .update(alert)
    .set({
      metadata: { ...(current.metadata as Record<string, unknown>), ...patch },
      ...(status ? { status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(alert.id, current.id))
    .returning();
  return updated ?? null;
}

/**
 * Opens a docket for an AI incident and moves all of its evidence onto it.
 * actorUserId is the officer who reviewed it, or null for an event type
 * that is docketed automatically (a panic press). Idempotent: an incident
 * that already has a docket returns it.
 */
export async function openAiDocket(
  incidentId: string,
  actorUserId: string | null,
): Promise<{ case: AiCaseRow; created: boolean }> {
  const found = await getAiIncidentOrThrow(incidentId);
  const existing = await findLinkedCase(found.id);
  if (existing) return { case: existing, created: false };

  // Claim it first, so two officers pressing at once can't open two dockets.
  const [claimed] = await db
    .update(incident)
    .set({ status: AI_INCIDENT_STATUS.DOCKETED, updatedAt: new Date() })
    .where(
      and(
        eq(incident.id, found.id),
        inArray(incident.status, [AI_INCIDENT_STATUS.PENDING_REVIEW, AI_INCIDENT_STATUS.DISMISSED, "REPORTED"]),
      ),
    )
    .returning();
  if (!claimed) {
    const raced = await findLinkedCase(found.id);
    if (raced) return { case: raced, created: false };
    throw new AiReviewError("CONFLICT", "A docket is already being opened for this incident");
  }

  const reviewed = actorUserId !== null;
  const createdCase = await insertCaseWithGeneratedNumber({
    caseType: "AI_GENERATED",
    title: reviewed ? `AI detection: ${found.title ?? found.incidentType}` : `Auto-docket: ${found.title ?? found.incidentType}`,
    description: found.description,
    priority: found.severity,
    assignedToUserId: null,
    createdByUserId: actorUserId,
  });

  await recordCaseEvent({
    caseId: createdCase.id,
    eventType: "CASE_CREATED",
    summary: reviewed
      ? `Case ${createdCase.caseNumber} opened from an AI detection after officer review: ${createdCase.title}`
      : `Case ${createdCase.caseNumber} auto-opened by AI pipeline: ${createdCase.title}`,
    payload: { caseType: createdCase.caseType, priority: createdCase.priority, source: "ai_pipeline", reviewed },
    actorUserId,
  });

  await db.insert(caseIncident).values({ caseId: createdCase.id, incidentId: found.id }).onConflictDoNothing();
  await recordCaseEvent({
    caseId: createdCase.id,
    eventType: "INCIDENT_LINKED",
    summary: `Incident ${found.incidentNumber} linked to case`,
    payload: { incidentId: found.id },
    actorUserId,
  });

  // Evidence captured before the docket existed. One timeline entry for the
  // lot: the per-item custody records were written when each was captured.
  const evidence = await listIncidentEvidence(found.id);
  if (evidence.length > 0) {
    await db.insert(caseEvidence).values(
      evidence.map((item) => ({
        caseId: createdCase.id,
        evidenceEntityType: EVIDENCE_ENTITY_TYPE,
        evidenceEntityId: item.id,
        relationshipDescription: `${item.title} from AI detection`,
        createdByUserId: actorUserId,
      })),
    );
    await recordCaseEvent({
      caseId: createdCase.id,
      eventType: "EVIDENCE_LINKED",
      summary: `${evidence.length} AI evidence item(s) captured before the docket was opened linked to case`,
      payload: { evidenceIds: evidence.map((item) => item.id), source: "ai_pipeline" },
      actorUserId,
    });
  }

  const review = { decision: "DOCKETED", byUserId: actorUserId, at: new Date().toISOString() };
  const updatedAlert = await updateAlertMetadata(found.id, {
    caseId: createdCase.id,
    caseNumber: createdCase.caseNumber,
    review,
  });

  await recordAuditEvent({
    eventType: reviewed ? "ai.incident_docketed" : "ai.incident_auto_docketed",
    domain: "ai_pipeline",
    actorId: actorUserId,
    targetEntityType: "CASE",
    targetEntityId: createdCase.id,
    action: "CREATE",
    payload: {
      incidentId: found.id,
      alertId: updatedAlert?.id ?? null,
      evidenceIds: evidence.map((item) => item.id),
    },
  });

  return { case: createdCase, created: true };
}

/**
 * Marks a pending AI incident as a false alarm. The evidence stays, with
 * its custody record, under the normal retention rules; the decision is
 * kept on the alert and in the audit log, which also measures how often
 * each model is wrong.
 */
export async function dismissAiIncident(incidentId: string, actorUserId: string, reason?: string) {
  const found = await getAiIncidentOrThrow(incidentId);
  const [dismissed] = await db
    .update(incident)
    .set({ status: AI_INCIDENT_STATUS.DISMISSED, updatedAt: new Date() })
    .where(and(eq(incident.id, found.id), eq(incident.status, AI_INCIDENT_STATUS.PENDING_REVIEW)))
    .returning();
  if (!dismissed) {
    throw new AiReviewError(
      "CONFLICT",
      found.status === AI_INCIDENT_STATUS.DISMISSED
        ? "This detection was already dismissed"
        : "This detection already has a docket",
    );
  }

  const review = { decision: "DISMISSED", byUserId: actorUserId, at: new Date().toISOString(), reason: reason ?? null };
  const updatedAlert = await updateAlertMetadata(found.id, { review }, "RESOLVED");

  await recordAuditEvent({
    eventType: "ai.incident_dismissed",
    domain: "ai_pipeline",
    actorId: actorUserId,
    targetEntityType: "INCIDENT",
    targetEntityId: found.id,
    action: "UPDATE",
    payload: { alertId: updatedAlert?.id ?? null, reason: reason ?? null, incidentType: found.incidentType },
  });

  return dismissed;
}

// What an officer needs to decide: the incident and every image of it.
export async function getAiIncidentReview(incidentId: string) {
  const found = await getAiIncidentOrThrow(incidentId);
  const [linkedCase, evidence] = await Promise.all([findLinkedCase(found.id), listIncidentEvidence(found.id)]);
  return { incident: found, case: linkedCase, evidence };
}
