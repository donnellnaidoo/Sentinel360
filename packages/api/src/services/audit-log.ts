import { createHash } from "node:crypto";

import { db } from "@Sentinel360/db";
import { auditLog } from "@Sentinel360/db/schema/audit";
import { desc } from "drizzle-orm";

export interface RecordAuditEventInput {
  eventType: string;
  domain: string;
  actorId?: string | null;
  targetEntityType?: string;
  targetEntityId?: string;
  action: string;
  payload?: Record<string, unknown>;
}

// Top-level-only key sort — good enough for a demo audit trail, not a
// legally-canonical hash chain (nested object key order isn't normalized).
function canonical(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

/**
 * Appends one row to the hash-chained audit_log ledger (packages/db/src/schema/audit.ts).
 * Every new row's entryHash covers the previous row's hash, so the chain can
 * be replayed to detect tampering. Call this from mutations that should show
 * up in the audit log — it is not wired automatically.
 */
export async function recordAuditEvent(input: RecordAuditEventInput) {
  const [previous] = await db
    .select({ entryHash: auditLog.entryHash })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(1);

  const payload = input.payload ?? {};
  const previousHash = previous?.entryHash ?? null;
  const entryHash = createHash("sha256")
    .update((previousHash ?? "") + canonical(payload))
    .digest("hex");

  const [row] = await db
    .insert(auditLog)
    .values({
      eventType: input.eventType,
      domain: input.domain,
      actorId: input.actorId ?? null,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      action: input.action,
      payload,
      previousHash,
      entryHash,
    })
    .returning();

  return row;
}
