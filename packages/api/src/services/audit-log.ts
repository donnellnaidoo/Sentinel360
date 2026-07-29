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

// Recursively sorts object keys (including inside nested objects and inside
// array elements) before stringifying, so two payloads with the same data
// but different key insertion order always hash identically. Array
// *element order* is preserved — only object keys are reordered — since
// element order can itself be meaningful (e.g. an ordered list of steps).
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = canonicalValue(source[key]);
    }
    return sorted;
  }
  return value;
}

function canonical(payload: Record<string, unknown>): string {
  return JSON.stringify(canonicalValue(payload));
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
