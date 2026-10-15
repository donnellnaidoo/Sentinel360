import { db } from "@Sentinel360/db";
import { caseEvidence, incident, investigationCase } from "@Sentinel360/db/schema/cases";
import { mediaAsset } from "@Sentinel360/db/schema/evidence";
import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";

import { AI_INCIDENT_STATUS } from "./ai-review";
import { recordAuditEvent } from "./audit-log";
import { recordCaseEvent } from "./case-timeline";
import { EVIDENCE_ENTITY_TYPE, recordCustodyEvent } from "./chain-of-custody";
import { deleteEvidenceFile } from "./evidence-storage";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Batch-applies the CLOSED -> ARCHIVED transition case-status.ts already
 * permits (closed >= 90 days, mirrored here via the same cutoff) to every
 * case that qualifies, instead of requiring each one to be archived
 * individually via cases.updateStatus.
 *
 * Manually triggered (see cases.runRetentionSweep, superAdminProcedure) —
 * there's no job queue/cron infra in this codebase yet
 * (docs/00-INVESTIGATION-MAP/02-GAP-ANALYSIS.md GAP-INF-06), so this needs
 * to be invoked periodically by an operator until one exists; it does not
 * run itself on a schedule.
 */
export async function sweepCaseRetention(actorUserId: string) {
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS);

  const eligible = await db
    .select()
    .from(investigationCase)
    .where(and(eq(investigationCase.status, "CLOSED"), lt(investigationCase.closedAt, cutoff)));

  for (const caseRow of eligible) {
    await db
      .update(investigationCase)
      .set({ status: "ARCHIVED", updatedAt: new Date() })
      .where(eq(investigationCase.id, caseRow.id));

    await recordCaseEvent({
      caseId: caseRow.id,
      eventType: "STATUS_CHANGE",
      summary: "Status changed from CLOSED to ARCHIVED: automated retention sweep (closed > 90 days)",
      payload: { from: "CLOSED", to: "ARCHIVED", reason: "retention_sweep" },
      actorUserId,
    });
  }

  return {
    archivedCaseIds: eligible.map((row) => row.id),
    archivedCount: eligible.length,
    cutoff,
  };
}

// Captures of an AI detection an officer dismissed as a false alarm: images
// of bystanders with no case to justify keeping them (POPIA s14, retention
// of records). Long enough to revisit a dismissal or to use them
// for checking the models; then the files are deleted.
export const AI_DISMISSED_RETENTION_DAYS = 30;
export const DISPOSED_MEDIA_STATUS = "DISPOSED";

/**
 * Deletes the image files of AI incidents dismissed more than
 * AI_DISMISSED_RETENTION_DAYS ago. Each media_asset row stays as a
 * tombstone (status DISPOSED, hash kept) with a DISPOSED chain-of-custody
 * entry, so the ledger still accounts for every file. Anything linked to a
 * case is never touched, whatever the incident's status.
 */
export async function sweepDismissedAiCaptures(actorUserId: string | null) {
  const cutoff = new Date(Date.now() - AI_DISMISSED_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const dismissed = await db
    .select({ id: incident.id })
    .from(incident)
    .where(
      and(
        eq(incident.sourceDomain, "ai_pipeline"),
        eq(incident.status, AI_INCIDENT_STATUS.DISMISSED),
        lt(incident.updatedAt, cutoff),
      ),
    );
  if (dismissed.length === 0) {
    return { disposedEvidenceIds: [] as string[], disposedCount: 0, incidentCount: 0, cutoff };
  }
  const incidentIds = dismissed.map((row) => row.id);

  const captures = await db
    .select()
    .from(mediaAsset)
    .where(
      and(
        inArray(sql<string>`${mediaAsset.metadata}->>'incidentId'`, incidentIds),
        ne(mediaAsset.status, DISPOSED_MEDIA_STATUS),
      ),
    );
  const linked = captures.length
    ? await db
        .select({ id: caseEvidence.evidenceEntityId })
        .from(caseEvidence)
        .where(
          and(
            eq(caseEvidence.evidenceEntityType, EVIDENCE_ENTITY_TYPE),
            inArray(
              caseEvidence.evidenceEntityId,
              captures.map((item) => item.id),
            ),
          ),
        )
    : [];
  const onACase = new Set(linked.map((row) => row.id));

  const disposed: string[] = [];
  for (const item of captures) {
    if (onACase.has(item.id)) continue;
    // Leave it for the next sweep if the file couldn't be deleted.
    if (!(await deleteEvidenceFile(item.storageUrl))) continue;
    await db
      .update(mediaAsset)
      .set({ status: DISPOSED_MEDIA_STATUS, updatedAt: new Date() })
      .where(eq(mediaAsset.id, item.id));
    await recordCustodyEvent({
      evidenceEntityId: item.id,
      action: "DISPOSED",
      evidenceHash: item.fileHash,
      reason: `File deleted: AI detection dismissed as a false alarm over ${AI_DISMISSED_RETENTION_DAYS} days ago (retention sweep)`,
      fromUserId: actorUserId,
      metadata: { incidentId: (item.metadata as Record<string, unknown>).incidentId, storagePath: item.storageUrl },
    });
    disposed.push(item.id);
  }

  await recordAuditEvent({
    eventType: "ai.dismissed_captures_disposed",
    domain: "ai_pipeline",
    actorId: actorUserId,
    targetEntityType: "MEDIA_ASSET",
    action: "DELETE",
    payload: { incidentIds, disposedEvidenceIds: disposed, cutoff: cutoff.toISOString() },
  });

  return { disposedEvidenceIds: disposed, disposedCount: disposed.length, incidentCount: incidentIds.length, cutoff };
}
