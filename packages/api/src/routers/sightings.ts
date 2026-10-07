import { db } from "@Sentinel360/db";
import { user } from "@Sentinel360/db/schema/auth";
import { investigationCase } from "@Sentinel360/db/schema/cases";
import { entityProfile } from "@Sentinel360/db/schema/entities";
import { mediaAsset } from "@Sentinel360/db/schema/evidence";
import { communitySighting } from "@Sentinel360/db/schema/sightings";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, inArray, ne, or, type SQL } from "drizzle-orm";

import { protectedProcedure, requirePermission, router } from "../index";
import {
  idSchema,
  sightingListSchema,
  submitSightingSchema,
  verifySightingSchema,
} from "../validators";
import { recordAuditEvent } from "../services/audit-log";
import { sha256Hex } from "../services/chain-of-custody";
import { uploadEvidenceFile, deleteEvidenceFile } from "../services/evidence-storage";
import { insertSightingWithGeneratedNumber } from "../services/sighting-number";
import { canViewSensitiveCase, getCaseOrThrow } from "../services/case-access";
import { insertCaseWithGeneratedNumber } from "../services/case-number";
import { recordCaseEvent } from "../services/case-timeline";
import {
  createIncidentForSighting,
  findSuggestedCaseIds,
  linkSightingIncidentToCase,
} from "../services/sighting-case-link";
import { readSuggestedCaseIds, toCommunitySightingView } from "../services/sighting-case-link-rules";
import { getEvidenceSignedUrl } from "../services/evidence-storage";

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

// verify runs under sightings:moderate, but linking into a case is a case
// write — check the matching case/evidence permission too.
function assertHasPermission(
  ctx: { session: { user: { permissions?: string[] } } },
  permission: string,
  message: string,
): void {
  if (!(ctx.session.user.permissions ?? []).includes(permission)) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
}

// Only active, watchlisted profiles appear on the community wanted feed, so
// only those can be named as a sighting's subject.
async function assertPublicWantedProfile(id: string): Promise<void> {
  const [found] = await db
    .select({ id: entityProfile.id })
    .from(entityProfile)
    .where(
      and(
        eq(entityProfile.id, id),
        ne(entityProfile.watchlistStatus, "NONE"),
        eq(entityProfile.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!found) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That wanted person is no longer listed" });
  }
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
    // Validate the subject before uploading anything, so a stale wanted
    // listing doesn't leave orphaned photos behind.
    if (input.subjectEntityProfileId) {
      await assertPublicWantedProfile(input.subjectEntityProfileId);
    }
    const suggestedCaseIds = input.subjectEntityProfileId
      ? await findSuggestedCaseIds(input.subjectEntityProfileId)
      : [];

    console.log("!!! NEW MULTI-PHOTO SIGHTINGS ROUTER IS RUNNING !!!");
    console.log("SERVER submit photos:", {
      count: input.photos.length,
      photos: input.photos.map((photo) => ({
        mimeType: photo.mimeType,
        originalFilename: photo.originalFilename,
        fileSize: photo.fileSize,
        base64Length: photo.base64.length,
      })),
    });

    const mediaIds: string[] = [];

    console.log("Starting evidence upload loop");

    for(const photo of input.photos)
    {
      const fileBytes = Buffer.from(photo.base64, "base64");
      const fileHash = sha256Hex(fileBytes);

      const { storagePath } = await uploadEvidenceFile(
        fileBytes,
        photo.originalFilename,
        photo.mimeType,
      );

      let createdMedia;

      try {
        const [createdMedia] = await db
          .insert(mediaAsset)
          .values({
            type: "PHOTO",
            title: `Sighting photo - ${photo.originalFilename}`,
            source: "SIGHTING",
            originalFilename: photo.originalFilename,
            mimeType: photo.mimeType,
            fileSize: photo.fileSize ?? fileBytes.length,
            fileHash,
            storageUrl: storagePath,
            status: "READY",

            createdByUserId: input.isAnonymous ? null : ctx.session.user.id,
          })
          .returning();

        if (createdMedia) {
          mediaIds.push(createdMedia.id);
        }

        console.log("Created media asset:", {
          id: createdMedia?.id,
          storagePath,
        });

      } catch (error) {
        console.error("MEDIA ASSET INSERT FAILED:", error);

        await deleteEvidenceFile(storagePath);

        // if (error && typeof error === "object" && "cause" in error) {
        //   console.error(
        //     "MEDIA ASSET DATABASE CAUSE:",
        //     (error as { cause?: unknown }).cause,
        //   );
        // }

        
        throw error;
      }

      // [createdMedia] = await db
      //   .insert(mediaAsset)
      //   .values({
      //     type: "PHOTO",
      //     title: `Sighting photo - ${photo.originalFilename}`,
      //     source: "SIGHTING",
      //     originalFilename: photo.originalFilename,
      //     mimeType: photo.mimeType,
      //     fileSize: photo.fileSize ?? fileBytes.length,
      //     fileHash,
      //     storageUrl: storagePath,
      //     status: "READY",

      //     createdByUserId: input.isAnonymous ? null : ctx.session.user.id,
      //   })
      //   .returning();

      

        

        
    }

    console.log("Final mediaIds before sighting insert:", mediaIds);

    const created = await insertSightingWithGeneratedNumber({
      reporterUserId: input.isAnonymous ? null : ctx.session.user.id,
      isAnonymous: input.isAnonymous,
      sightingType: input.subjectEntityProfileId ? "WANTED_PERSON_SIGHTING" : input.sightingType,
      subjectEntityProfileId: input.subjectEntityProfileId ?? null,
      suggestedCaseIds,
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
      payload: {
        referenceCode: created.referenceCode,
        isAnonymous: input.isAnonymous,
        subjectEntityProfileId: created.subjectEntityProfileId,
      },
    });

    return toCommunitySightingView(created);
  }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(communitySighting)
      .where(eq(communitySighting.reporterUserId, ctx.session.user.id))
      .orderBy(desc(communitySighting.createdAt));
    return rows.map(toCommunitySightingView);
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
              ilike(communitySighting.title, `%${input.search}%`),
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
      const rows = await db
        .select({
          sighting: communitySighting,
          authorName: user.name,
          authorEmail: user.email,
          subjectName: entityProfile.displayName,
        })
        .from(communitySighting)
        .leftJoin(user, eq(communitySighting.reporterUserId, user.id))
        .leftJoin(entityProfile, eq(communitySighting.subjectEntityProfileId, entityProfile.id))
        .where(where)
        .orderBy(desc(communitySighting.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Never reveal who filed an anonymous report, even to moderators.
      const items = rows.map(({ sighting, authorName, authorEmail, subjectName }) => ({
        ...sighting,
        subjectName,
        author:
          !sighting.isAnonymous && authorName && authorEmail
            ? { name: authorName, email: authorEmail }
            : null,
      }));

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

  getPublicById: protectedProcedure
    .input(idSchema)
    .query(async ({ input }) => {
      const [found] = await db
      .select()
      .from(communitySighting)
      .where(
        and(
          eq(communitySighting.id, input.id),
          eq(communitySighting.visibility, "COMMUNITY"),
          eq(communitySighting.moderationStatus, "APPROVED"),
        ),
      )
      .limit(1);

      if(!found) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approved sighting not found",
        });
      }

      const mediaIds = Array.isArray(found.mediaIds)
        ? found.mediaIds.filter(
          (id): id is string =>
            typeof id === "string",
        )
        : [];

      
      
      const media = mediaIds.length > 0 ? await db
      .select({
        id: mediaAsset.id,
        type: mediaAsset.type,
        title: mediaAsset.title,
        originalFilename:
          mediaAsset.originalFilename,
        mimeType: mediaAsset.mimeType,
        storageUrl: mediaAsset.storageUrl,
        status: mediaAsset.status,
      })
      .from(mediaAsset)
      .where(inArray(mediaAsset.id, mediaIds))
      : [];

      const mediaWithSignedUrls = await Promise.all(
        media.map(async (item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          originalFileName: item.originalFilename,
          mimeType: item.mimeType,
          status: item.status,

          signedUrl: await getEvidenceSignedUrl(
            item.storageUrl,
            300,
          ),
        })),
      );

      console.log(
        "Signed sighting media:",
        mediaWithSignedUrls.map((item) => ({
          id: item.id,
          mimeType: item.mimeType,
          hasSignedUrl: Boolean(item.signedUrl),
        })),
      );

      return {
        ...toCommunitySightingView(found),
        media: mediaWithSignedUrls,
      };
    }),

  // Suggested cases for the moderator's "link to case" picker. Sensitive
  // cases the moderator can't see are left out rather than erroring, the
  // same as cases.list.
  caseLinkOptions: requirePermission("sightings:moderate")
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const sighting = await getSightingOrThrow(input.id);
      const suggestedIds = readSuggestedCaseIds(sighting.suggestedCaseIds);

      const rows =
        suggestedIds.length > 0
          ? await db
              .select({
                id: investigationCase.id,
                caseNumber: investigationCase.caseNumber,
                title: investigationCase.title,
                status: investigationCase.status,
                priority: investigationCase.priority,
                isSensitive: investigationCase.isSensitive,
                assignedToUserId: investigationCase.assignedToUserId,
              })
              .from(investigationCase)
              .where(inArray(investigationCase.id, suggestedIds))
          : [];

      const byId = new Map(rows.map((row) => [row.id, row]));
      const suggestedCases = suggestedIds
        .map((id) => byId.get(id))
        .filter((row): row is NonNullable<typeof row> => row !== undefined)
        .filter((row) => !row.isSensitive || canViewSensitiveCase(row, ctx))
        .map(({ assignedToUserId: _assignedToUserId, ...row }) => row);

      return { suggestedCases };
    }),

  verify: requirePermission("sightings:moderate")
    .input(verifySightingSchema)
    .mutation(async ({ ctx, input }) => {
      const sighting = await getSightingOrThrow(input.id);
      // Approval creates an incident and case links, so a second decision
      // on the same sighting would duplicate them.
      if (sighting.moderationStatus !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This sighting has already been moderated" });
      }

      const actorUserId = ctx.session.user.id;
      const approved = input.decision === "APPROVED";
      const caseLink = approved ? input.caseLink : { mode: "none" as const };

      // --- Validate everything before writing anything ---
      let duplicateOfSightingId: string | null = null;
      if (input.decision === "DUPLICATE" && input.duplicateOfReferenceCode) {
        const [original] = await db
          .select({ id: communitySighting.id })
          .from(communitySighting)
          .where(eq(communitySighting.referenceCode, input.duplicateOfReferenceCode.trim().toUpperCase()))
          .limit(1);
        if (!original) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `No sighting with reference ${input.duplicateOfReferenceCode}`,
          });
        }
        if (original.id === sighting.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A sighting can't be a duplicate of itself" });
        }
        duplicateOfSightingId = original.id;
      }

      let caseRow: typeof investigationCase.$inferSelect | null = null;
      if (caseLink.mode === "existing") {
        assertHasPermission(ctx, "cases:update", "You don't have permission to link sightings to cases");
        caseRow = await getCaseOrThrow(caseLink.caseId, ctx);
      } else if (caseLink.mode === "new") {
        assertHasPermission(ctx, "cases:create", "You don't have permission to open cases");
      }
      const attachPhotos = caseLink.mode !== "none" && input.attachPhotosAsEvidence;
      if (attachPhotos) {
        assertHasPermission(ctx, "evidence:create", "You don't have permission to add case evidence");
      }

      // --- Writes ---
      let linkedIncidentId: string | null = null;
      let photosAttached = 0;
      if (approved) {
        const createdIncident = await createIncidentForSighting(sighting);
        linkedIncidentId = createdIncident.id;

        if (caseLink.mode === "new") {
          caseRow = await insertCaseWithGeneratedNumber({
            caseType: "COMMUNITY_SIGHTING",
            title: caseLink.title?.trim() || createdIncident.title || `Community sighting ${sighting.referenceCode}`,
            description: sighting.description,
            priority: "MEDIUM",
            assignedToUserId: null,
            createdByUserId: actorUserId,
          });
          await recordCaseEvent({
            caseId: caseRow.id,
            eventType: "CASE_CREATED",
            summary: `Case ${caseRow.caseNumber} opened from community sighting ${sighting.referenceCode}`,
            payload: { caseType: caseRow.caseType, priority: caseRow.priority, sightingId: sighting.id },
            actorUserId,
          });
        }

        if (caseRow) {
          ({ photosAttached } = await linkSightingIncidentToCase({
            sighting,
            incident: createdIncident,
            caseRow,
            actorUserId,
            attachPhotos,
          }));
        }
      }

      const [updated] = await db
        .update(communitySighting)
        .set({
          moderationStatus: input.decision,
          moderationReason: input.notes ?? null,
          operatorNotes: input.notes ?? null,
          visibility: approved ? "COMMUNITY" : "PRIVATE",
          status: "RESOLVED",
          linkedIncidentId,
          duplicateOfSightingId,
          updatedAt: new Date(),
        })
        .where(eq(communitySighting.id, input.id))
        .returning();

      await recordAuditEvent({
        eventType: DECISION_TO_EVENT[input.decision] ?? "sighting.verified",
        domain: "SIGHTINGS",
        actorId: actorUserId,
        targetEntityType: "COMMUNITY_SIGHTING",
        targetEntityId: input.id,
        action: "UPDATE",
        payload: {
          decision: input.decision,
          notes: input.notes ?? null,
          caseLinkMode: caseLink.mode,
          caseId: caseRow?.id ?? null,
          incidentId: linkedIncidentId,
          photosAttached,
          duplicateOfSightingId,
        },
      });

      return {
        ...updated,
        linkedCase: caseRow ? { id: caseRow.id, caseNumber: caseRow.caseNumber } : null,
        // Lets the caller tell the reporter "passed to investigators"
        // without revealing which case.
        passedToInvestigators: caseRow !== null,
        photosAttached,
      };
    }),
});
