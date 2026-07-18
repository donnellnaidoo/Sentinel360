import { db } from "@Sentinel360/db";
import { caseEvidence } from "@Sentinel360/db/schema/cases";
import { mediaAsset } from "@Sentinel360/db/schema/evidence";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { requirePermission, router } from "../index";
import {
  createEvidenceSchema,
  evidenceListSchema,
  idSchema,
  verifyEvidenceIntegritySchema,
} from "../validators";
import {
  EVIDENCE_ENTITY_TYPE,
  getCustodyChain,
  recordCustodyEvent,
  sha256Hex,
  verifyEvidenceIntegrity,
} from "../services/chain-of-custody";
import {
  downloadEvidenceFile,
  getEvidenceSignedUrl,
  uploadEvidenceFile,
} from "../services/evidence-storage";

function pushIf<T>(arr: T[], item: T | undefined): void {
  if (item !== undefined) {
    arr.push(item);
  }
}

async function getEvidenceOrThrow(id: string) {
  const [found] = await db.select().from(mediaAsset).where(eq(mediaAsset.id, id)).limit(1);
  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Evidence not found" });
  }
  return found;
}

export const evidenceRouter = router({
  list: requirePermission("evidence:read")
    .input(evidenceListSchema)
    .query(async ({ input }) => {
      if (input.caseId) {
        const links = await db
          .select({ evidenceEntityId: caseEvidence.evidenceEntityId })
          .from(caseEvidence)
          .where(
            and(
              eq(caseEvidence.caseId, input.caseId),
              eq(caseEvidence.evidenceEntityType, EVIDENCE_ENTITY_TYPE),
            ),
          );
        const ids = links.map((l) => l.evidenceEntityId);
        if (ids.length === 0) {
          return { items: [], total: 0, limit: input.limit, offset: input.offset };
        }
        const items = await db
          .select()
          .from(mediaAsset)
          .where(
            or(...ids.map((id) => eq(mediaAsset.id, id))),
          )
          .orderBy(desc(mediaAsset.createdAt))
          .limit(input.limit)
          .offset(input.offset);
        return { items, total: ids.length, limit: input.limit, offset: input.offset };
      }

      const conditions: SQL[] = [];
      pushIf(
        conditions,
        input.search ? ilike(mediaAsset.title, `%${input.search}%`) : undefined,
      );
      pushIf(conditions, input.status ? eq(mediaAsset.status, input.status) : undefined);
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(mediaAsset).where(where);
      const items = await db
        .select()
        .from(mediaAsset)
        .where(where)
        .orderBy(desc(mediaAsset.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items,
        total: totalResult?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  getById: requirePermission("evidence:read").input(idSchema).query(async ({ input }) => {
    return getEvidenceOrThrow(input.id);
  }),

  upload: requirePermission("evidence:create")
    .input(createEvidenceSchema)
    .mutation(async ({ ctx, input }) => {
      const fileBytes = Buffer.from(input.fileBase64, "base64");
      const fileHash = sha256Hex(fileBytes);

      const { storagePath } = await uploadEvidenceFile(
        fileBytes,
        input.originalFilename,
        input.mimeType,
      );

      const [created] = await db
        .insert(mediaAsset)
        .values({
          type: input.type,
          title: input.title,
          description: input.description,
          source: input.source,
          sourceCameraId: input.sourceCameraId,
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          fileSize: fileBytes.length,
          fileHash,
          storageUrl: storagePath,
          status: "READY",
          gpsLatitude:
            input.gpsLatitude !== undefined ? String(input.gpsLatitude) : undefined,
          gpsLongitude:
            input.gpsLongitude !== undefined ? String(input.gpsLongitude) : undefined,
          createdByUserId: ctx.session.user.id,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Evidence record was not created",
        });
      }

      await recordCustodyEvent({
        evidenceEntityId: created.id,
        action: "CREATED",
        evidenceHash: fileHash,
        reason: "Evidence uploaded",
        toUserId: ctx.session.user.id,
      });

      if (input.caseId) {
        await db.insert(caseEvidence).values({
          caseId: input.caseId,
          evidenceEntityType: EVIDENCE_ENTITY_TYPE,
          evidenceEntityId: created.id,
          relationshipDescription: input.relationshipDescription,
          createdByUserId: ctx.session.user.id,
        });
      }

      return created;
    }),

  getDownloadUrl: requirePermission("evidence:read")
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const evidence = await getEvidenceOrThrow(input.id);
      const url = await getEvidenceSignedUrl(evidence.storageUrl);

      // Every access must be logged — this is not optional telemetry, it's
      // the chain-of-custody record that makes the evidence admissible.
      await recordCustodyEvent({
        evidenceEntityId: evidence.id,
        action: "ACCESSED",
        evidenceHash: evidence.fileHash,
        reason: "Download URL requested",
        toUserId: ctx.session.user.id,
      });

      return { url, expiresInSeconds: 300 };
    }),

  verifyIntegrity: requirePermission("evidence:read")
    .input(verifyEvidenceIntegritySchema)
    .mutation(async ({ ctx, input }) => {
      const evidence = await getEvidenceOrThrow(input.evidenceId);
      const fileBytes = await downloadEvidenceFile(evidence.storageUrl);
      return verifyEvidenceIntegrity(
        evidence.id,
        evidence.fileHash,
        fileBytes,
        ctx.session.user.id,
      );
    }),

  getCustodyChain: requirePermission("evidence:read")
    .input(idSchema)
    .query(async ({ input }) => {
      await getEvidenceOrThrow(input.id);
      return getCustodyChain(input.id);
    }),
});
