import { db } from "@Sentinel360/db";
import { investigationCase } from "@Sentinel360/db/schema/cases";
import { and, eq, lt } from "drizzle-orm";

import { recordCaseEvent } from "./case-timeline";

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
