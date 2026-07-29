import { db } from "@Sentinel360/db";
import { user } from "@Sentinel360/db/schema/auth";
import { caseTimelineEntry, investigationCase, investigationNote } from "@Sentinel360/db/schema/cases";
import { dataDeletionRequest } from "@Sentinel360/db/schema/popia";
import { communitySighting } from "@Sentinel360/db/schema/sightings";
import { TRPCError } from "@trpc/server";
import { count, desc, eq } from "drizzle-orm";

import { adminProcedure, protectedProcedure, router } from "../index";
import {
  dataDeletionRequestListSchema,
  requestDataDeletionSchema,
  reviewDataDeletionRequestSchema,
} from "../validators";
import { recordAuditEvent } from "../services/audit-log";

export const popiaRouter = router({
  // POPIA s23 subject access request: every category of personal
  // information Sentinel360 holds against the caller's own account.
  // Self-service — a data subject doesn't need admin approval to see their
  // own data, only to have it changed/deleted.
  myData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [
      profileRows,
      casesReported,
      casesAssigned,
      notesAuthored,
      sightingsSubmitted,
      timelineActions,
      deletionRequests,
    ] = await Promise.all([
      db.select().from(user).where(eq(user.id, userId)).limit(1),
      db.select().from(investigationCase).where(eq(investigationCase.createdByUserId, userId)),
      db.select().from(investigationCase).where(eq(investigationCase.assignedToUserId, userId)),
      db.select().from(investigationNote).where(eq(investigationNote.createdByUserId, userId)),
      db.select().from(communitySighting).where(eq(communitySighting.reporterUserId, userId)),
      db.select().from(caseTimelineEntry).where(eq(caseTimelineEntry.actorUserId, userId)),
      db.select().from(dataDeletionRequest).where(eq(dataDeletionRequest.userId, userId)),
    ]);

    return {
      profile: profileRows[0] ?? null,
      popiaConsentAt: profileRows[0]?.popiaConsentAt ?? null,
      casesReported,
      casesAssigned,
      notesAuthored,
      sightingsSubmitted,
      timelineActions,
      deletionRequests,
      exportedAt: new Date().toISOString(),
    };
  }),

  // Recaptures POPIA s11 consent for accounts created before consent
  // capture existed at registration (migration 0005_popia_consent.sql
  // backfilled those rows NULL rather than fabricating a consent date).
  // No-op if consent is already on record — never clears an existing
  // timestamp.
  giveConsent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [existing] = await db
      .select({ popiaConsentAt: user.popiaConsentAt })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (existing?.popiaConsentAt) {
      return { popiaConsentAt: existing.popiaConsentAt };
    }

    const consentedAt = new Date();
    await db
      .update(user)
      .set({ popiaConsentAt: consentedAt, updatedAt: consentedAt })
      .where(eq(user.id, userId));

    await recordAuditEvent({
      eventType: "popia.consent_recorded",
      domain: "POPIA",
      actorId: userId,
      targetEntityType: "USER",
      targetEntityId: userId,
      action: "UPDATE",
      payload: {},
    });

    return { popiaConsentAt: consentedAt };
  }),

  // POPIA s24: files a deletion request for review — not an immediate
  // delete. See dataDeletionRequest schema comment for why.
  requestDeletion: protectedProcedure
    .input(requestDataDeletionSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(dataDeletionRequest)
        .values({ userId: ctx.session.user.id, reason: input.reason })
        .returning();

      await recordAuditEvent({
        eventType: "popia.deletion_requested",
        domain: "POPIA",
        actorId: ctx.session.user.id,
        targetEntityType: "USER",
        targetEntityId: ctx.session.user.id,
        action: "CREATE",
        payload: { requestId: created?.id },
      });

      return created;
    }),

  listDeletionRequests: adminProcedure
    .input(dataDeletionRequestListSchema)
    .query(async ({ input }) => {
      const where = input.status ? eq(dataDeletionRequest.status, input.status) : undefined;
      const [totalResult] = await db
        .select({ count: count() })
        .from(dataDeletionRequest)
        .where(where);
      const items = await db
        .select()
        .from(dataDeletionRequest)
        .where(where)
        .orderBy(desc(dataDeletionRequest.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { items, total: totalResult?.count ?? 0, limit: input.limit, offset: input.offset };
    }),

  // Approving anonymizes the profile fields with no independent retention
  // basis (name, email, phone, image) and deactivates the account. It
  // deliberately leaves case/evidence/audit_log/timeline rows the user is
  // linked to untouched — POPIA s11(1)(d)/(f) permits retaining personal
  // information necessary to comply with a legal obligation or for a
  // legitimate interest, and CPA 51/1977 evidentiary retention is exactly
  // that for investigation records.
  reviewDeletionRequest: adminProcedure
    .input(reviewDataDeletionRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(dataDeletionRequest)
        .where(eq(dataDeletionRequest.id, input.id))
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deletion request not found" });
      }
      if (existing.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request has already been reviewed",
        });
      }

      const reviewedAt = new Date();

      if (input.decision === "APPROVED") {
        await db
          .update(user)
          .set({
            name: "[deleted]",
            email: `deleted-${existing.userId}@sentinel360.invalid`,
            firstName: null,
            lastName: null,
            phoneNumber: null,
            image: null,
            isActive: false,
            updatedAt: reviewedAt,
          })
          .where(eq(user.id, existing.userId));
      }

      const [updated] = await db
        .update(dataDeletionRequest)
        .set({
          status: input.decision === "APPROVED" ? "COMPLETED" : "REJECTED",
          reviewedByUserId: ctx.session.user.id,
          reviewNotes: input.reviewNotes,
          reviewedAt,
        })
        .where(eq(dataDeletionRequest.id, input.id))
        .returning();

      await recordAuditEvent({
        eventType:
          input.decision === "APPROVED" ? "popia.deletion_completed" : "popia.deletion_rejected",
        domain: "POPIA",
        actorId: ctx.session.user.id,
        targetEntityType: "USER",
        targetEntityId: existing.userId,
        action: "UPDATE",
        payload: { requestId: existing.id, decision: input.decision },
      });

      return updated;
    }),
});
