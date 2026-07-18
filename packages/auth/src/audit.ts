import { createHash } from "node:crypto";

import { db } from "@Sentinel360/db";
import { auditLog } from "@Sentinel360/db/schema/audit";
import { desc } from "drizzle-orm";

export interface AuditEvent {
  eventType: string;
  domain: string;
  actorId?: string | null;
  actorType?: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  action: string;
  payload?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function computeEntryHash(previousHash: string | null, entry: Record<string, unknown>): string {
  return createHash("sha256")
    .update(`${previousHash ?? ""}:${JSON.stringify(entry)}`)
    .digest("hex");
}

/**
 * Appends a tamper-evident audit event. Each row's entryHash chains from the
 * previous row's hash, so any row edited/deleted after the fact breaks the
 * chain on replay — required for CPA/POPIA-grade audit trails.
 *
 * Known limitation: reading the previous hash and inserting are not in a
 * single locked transaction, so two concurrent writers could theoretically
 * both read the same previousHash. Acceptable for current write volume;
 * revisit with SELECT ... FOR UPDATE if audit writes become highly concurrent.
 */
export async function recordAuditEvent(event: AuditEvent) {
  const [latest] = await db
    .select({ entryHash: auditLog.entryHash })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(1);
  const previousHash = latest?.entryHash ?? null;

  const entry = {
    eventType: event.eventType,
    domain: event.domain,
    actorId: event.actorId ?? null,
    actorType: event.actorType ?? "USER",
    targetEntityType: event.targetEntityType ?? null,
    targetEntityId: event.targetEntityId ?? null,
    action: event.action,
    payload: (event.payload ?? {}) as typeof auditLog.$inferInsert.payload,
    ipAddress: event.ipAddress ?? null,
    userAgent: event.userAgent ?? null,
  };

  await db.insert(auditLog).values({
    ...entry,
    entryHash: computeEntryHash(previousHash, entry),
    previousHash,
  });
}

export const AuditEvents = {
  USER_REGISTERED: "user.registered",
  USER_LOGGED_IN: "user.logged_in",
  USER_LOGGED_OUT: "user.logged_out",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DEACTIVATED: "user.deactivated",
  USER_LOCKED: "user.locked",
  PASSWORD_RESET: "user.password_reset",
  EMAIL_VERIFIED: "user.email_verified",
  ROLE_CREATED: "role.created",
  ROLE_UPDATED: "role.updated",
  ROLE_DELETED: "role.deleted",
  ROLE_ASSIGNED: "role.assigned",
  ROLE_REMOVED: "role.removed",
  PERMISSION_UPDATED: "permission.updated",
  ORGANIZATION_CREATED: "organization.created",
  ORGANIZATION_UPDATED: "organization.updated",
  ORGANIZATION_DEACTIVATED: "organization.deactivated",
} as const;
