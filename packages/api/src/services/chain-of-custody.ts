import { createHash } from "node:crypto";

import { db } from "@Sentinel360/db";
import { chainOfCustody, evidenceIntegrityCheck } from "@Sentinel360/db/schema/evidence";
import { asc, and, eq } from "drizzle-orm";

export const EVIDENCE_ENTITY_TYPE = "MEDIA_ASSET" as const;

export function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export interface RecordCustodyEventInput {
  evidenceEntityId: string;
  action: "CREATED" | "ACCESSED" | "TRANSFERRED" | "VERIFIED" | "EXPORTED" | "ANALYZED";
  evidenceHash: string;
  reason: string;
  fromUserId?: string | null;
  toUserId?: string | null;
  location?: string | null;
  metadata?: Record<string, unknown>;
  evidenceEntityType?: string;
}

/**
 * Appends one row to the immutable chain-of-custody ledger. Never updates or
 * deletes existing rows — every access, transfer, or verification of a piece
 * of evidence must be independently replayable for court (CPA 51/1977,
 * ECTA s15). Callers must invoke this on every read/write of evidence
 * content, not just uploads.
 */
export async function recordCustodyEvent(input: RecordCustodyEventInput) {
  const [row] = await db
    .insert(chainOfCustody)
    .values({
      evidenceEntityType: input.evidenceEntityType ?? EVIDENCE_ENTITY_TYPE,
      evidenceEntityId: input.evidenceEntityId,
      action: input.action,
      evidenceHash: input.evidenceHash,
      reason: input.reason,
      fromUserId: input.fromUserId ?? null,
      toUserId: input.toUserId ?? null,
      location: input.location ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();
  return row;
}

export async function getCustodyChain(
  evidenceEntityId: string,
  evidenceEntityType: string = EVIDENCE_ENTITY_TYPE,
) {
  return db
    .select()
    .from(chainOfCustody)
    .where(
      and(
        eq(chainOfCustody.evidenceEntityType, evidenceEntityType),
        eq(chainOfCustody.evidenceEntityId, evidenceEntityId),
      ),
    )
    .orderBy(asc(chainOfCustody.createdAt));
}

/**
 * Re-hashes the actual stored bytes and compares against the hash recorded
 * at upload time. Writes an immutable evidence_integrity_check row either
 * way (a failed check is itself evidence, not an error to hide) and appends
 * a VERIFIED custody event.
 */
export async function verifyEvidenceIntegrity(
  evidenceEntityId: string,
  storedHash: string,
  actualBytes: Buffer,
  verifierUserId: string,
) {
  const computedHash = sha256Hex(actualBytes);
  const isValid = computedHash === storedHash;

  const [check] = await db
    .insert(evidenceIntegrityCheck)
    .values({
      evidenceEntityType: EVIDENCE_ENTITY_TYPE,
      evidenceEntityId,
      computedHash,
      storedHash,
      isValid,
    })
    .returning();

  await recordCustodyEvent({
    evidenceEntityId,
    action: "VERIFIED",
    evidenceHash: computedHash,
    reason: isValid ? "Integrity check passed" : "Integrity check FAILED — hash mismatch",
    toUserId: verifierUserId,
  });

  return { isValid, computedHash, storedHash, check };
}
