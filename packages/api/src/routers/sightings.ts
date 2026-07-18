import { db } from "@Sentinel360/db";
import { mediaAsset } from "@Sentinel360/db/schema/evidence";
import { communitySighting } from "@Sentinel360/db/schema/sightings";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { protectedProcedure, requirePermission, router } from "../index";
import {
  idSchema,
  sightingListSchema,
  submitSightingSchema,
  verifySightingSchema,
} from "../validators";
import { recordAuditEvent } from "../services/audit-log";
import { sha256Hex } from "../services/chain-of-custody";
import { uploadEvidenceFile } from "../services/evidence-storage";
import { insertSightingWithGeneratedNumber } from "../services/sighting-number";

function pushIf<T>(arr: T[], item: T | undefined): void {
  if (item !== undefined) {
    arr.push(item);
  }
}

async function getSightingOrThrow(id: string) {
  const [found] = await db
    .select()
    .from(communitySighting)
    .where(eq(communitySighting.id, id))
    .limit(1);
  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Sighting not found" });
  }
  return found;
}

const DECISION_TO_EVENT: Record<string, string> = {
  APPROVED: "sighting.verified",
  DUPLICATE: "sighting.marked_duplicate",
  REJECTED: "sighting.rejected",
};

export const sightingsRouter = router({
  // Any authenticated user (including community) can submit a sighting —
  // this is a self-service report, not an internal-operations action, so it
  // isn't gated by a sightings:* permission (matches users.me/updateMe).
  submit: protectedProcedure.input(submitSightingSchema).mutation(async ({ ctx, input }) => {
    const mediaIds: string[] = [];

    if (input.photoBase64 && input.mimeType && input.originalFilename) {
      const fileBytes = Buffer.from(input.photoBase64, "base64");
      const fileHash = sha256Hex(fileBytes);
      const { storagePath } = await uploadEvidenceFile(
        fileBytes,
        input.originalFilename,
        input.mimeType,
      );

      const [createdMedia] = await db
        .insert(mediaAsset)
        .values({
          type: "PHOTO",
          title: `Sighting photo — ${input.originalFilename}`,
          source: "SIGHTING",
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          fileSize: input.fileSize ?? fileBytes.length,
          fileHash,
          storageUrl: storagePath,
          status: "READY",
          createdByUserId: ctx.session.user.id,
        })
        .returning();
      if (createdMedia) mediaIds.push(createdMedia.id);
    }

    const created = await insertSightingWithGeneratedNumber({
      reporterUserId: input.isAnonymous ? null : ctx.session.user.id,
      isAnonymous: input.isAnonymous,
      sightingType: input.sightingType,
      description: input.description,
      location: input.location ?? {},
      occurredAt: input.observedAt,
      mediaIds,
      // Only moderator-approved sightings become public — the table
      // default of PUBLIC is overridden here.
      visibility: "PRIVATE",
    });

    await recordAuditEvent({
      eventType: "sighting.submitted",
      domain: "SIGHTINGS",
      actorId: input.isAnonymous ? null : ctx.session.user.id,
      targetEntityType: "COMMUNITY_SIGHTING",
      targetEntityId: created.id,
      action: "CREATE",
      payload: { referenceCode: created.referenceCode, isAnonymous: input.isAnonymous },
    });

    return created;
  }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(communitySighting)
      .where(eq(communitySighting.reporterUserId, ctx.session.user.id))
      .orderBy(desc(communitySighting.createdAt));
  }),

  list: requirePermission("sightings:read")
    .input(sightingListSchema)
    .query(async ({ input }) => {
      const conditions: SQL[] = [];
      pushIf(
        conditions,
        input.search
          ? or(
              ilike(communitySighting.description, `%${input.search}%`),
              ilike(communitySighting.referenceCode, `%${input.search}%`),
            )
          : undefined,
      );
      pushIf(
        conditions,
        input.moderationStatus
          ? eq(communitySighting.moderationStatus, input.moderationStatus)
          : undefined,
      );
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: count() })
        .from(communitySighting)
        .where(where);
      const items = await db
        .select()
        .from(communitySighting)
        .where(where)
        .orderBy(desc(communitySighting.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items,
        total: totalResult?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  getById: requirePermission("sightings:read").input(idSchema).query(async ({ input }) => {
    return getSightingOrThrow(input.id);
  }),

  verify: requirePermission("sightings:moderate")
    .input(verifySightingSchema)
    .mutation(async ({ ctx, input }) => {
      await getSightingOrThrow(input.id);

      const [updated] = await db
        .update(communitySighting)
        .set({
          moderationStatus: input.decision,
          moderationReason: input.notes,
          visibility: input.decision === "APPROVED" ? "PUBLIC" : "PRIVATE",
          status: "RESOLVED",
          updatedAt: new Date(),
        })
        .where(eq(communitySighting.id, input.id))
        .returning();

      await recordAuditEvent({
        eventType: DECISION_TO_EVENT[input.decision] ?? "sighting.verified",
        domain: "SIGHTINGS",
        actorId: ctx.session.user.id,
        targetEntityType: "COMMUNITY_SIGHTING",
        targetEntityId: input.id,
        action: "UPDATE",
        payload: { decision: input.decision },
      });

      return updated;
    }),
});
