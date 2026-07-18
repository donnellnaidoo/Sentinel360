import { db } from "@Sentinel360/db";
import { caseTimelineEntry } from "@Sentinel360/db/schema/cases";

import { recordAuditEvent } from "./audit-log";

export interface RecordCaseEventInput {
  caseId: string;
  eventType: string;
  summary: string;
  payload?: Record<string, unknown>;
  actorUserId?: string | null;
}

/**
 * Appends one row to case_timeline_entry (the docket's human-readable
 * activity feed) and mirrors the same action into the hash-chained
 * audit_log via recordAuditEvent, the way sightings.ts/alerts.ts already
 * do. Call this from every case-mutating procedure in routers/cases.ts so
 * the timeline and the audit trail never drift apart.
 */
export async function recordCaseEvent(input: RecordCaseEventInput) {
  const [entry] = await db
    .insert(caseTimelineEntry)
    .values({
      caseId: input.caseId,
      eventType: input.eventType,
      summary: input.summary,
      payload: input.payload ?? {},
      actorUserId: input.actorUserId ?? null,
    })
    .returning();

  await recordAuditEvent({
    domain: "cases",
    eventType: input.eventType,
    actorId: input.actorUserId,
    targetEntityType: "case",
    targetEntityId: input.caseId,
    action: input.summary,
    payload: input.payload ?? {},
  });

  return entry;
}
