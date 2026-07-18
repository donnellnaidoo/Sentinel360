import { db } from "@Sentinel360/db";
import { user } from "@Sentinel360/db/schema/auth";
import {
  caseArrest,
  caseCriminal,
  caseEvidence,
  caseHearing,
  caseIncident,
  caseProsecutionDecision,
  caseTimelineEntry,
  incident,
  investigationCase,
  investigationNote,
} from "@Sentinel360/db/schema/cases";
import { entityProfile } from "@Sentinel360/db/schema/entities";
import { TRPCError } from "@trpc/server";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, getTableColumns, ilike, or, type SQL } from "drizzle-orm";

const assignee = alias(user, "assignee");

import { requirePermission, router } from "../index";
import {
  caseCriminalIdSchema,
  caseIdSchema,
  caseListSchema,
  createCaseSchema,
  createInvestigationNoteSchema,
  idSchema,
  linkCaseCriminalSchema,
  linkEvidenceSchema,
  linkIncidentSchema,
  recordCaseArrestSchema,
  recordCaseHearingOutcomeSchema,
  recordProsecutionDecisionSchema,
  scheduleCaseHearingSchema,
  updateCaseSchema,
  updateCaseStatusSchema,
} from "../validators";
import { insertCaseWithGeneratedNumber } from "../services/case-number";
import { getCaseStatusTransitionError } from "../services/case-status";
import { getCaseNextActions } from "../services/case-next-actions";
import { recordCaseEvent } from "../services/case-timeline";

function pushIf<T>(arr: T[], item: T | undefined): void {
  if (item !== undefined) {
    arr.push(item);
  }
}

async function getCaseOrThrow(id: string) {
  const [found] = await db
    .select()
    .from(investigationCase)
    .where(eq(investigationCase.id, id))
    .limit(1);

  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
  }
  return found;
}

export const casesRouter = router({
  list: requirePermission("cases:read").input(caseListSchema).query(async ({ input }) => {
    const conditions: SQL[] = [];

    pushIf(
      conditions,
      input.search
        ? or(
            ilike(investigationCase.title, `%${input.search}%`),
            ilike(investigationCase.caseNumber, `%${input.search}%`),
          )
        : undefined,
    );
    pushIf(conditions, input.status ? eq(investigationCase.status, input.status) : undefined);
    pushIf(
      conditions,
      input.priority ? eq(investigationCase.priority, input.priority) : undefined,
    );
    pushIf(
      conditions,
      input.assignedToUserId
        ? eq(investigationCase.assignedToUserId, input.assignedToUserId)
        : undefined,
    );

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(investigationCase)
      .where(where);
    const items = await db
      .select({
        ...getTableColumns(investigationCase),
        assignedToName: assignee.name,
      })
      .from(investigationCase)
      .leftJoin(assignee, eq(investigationCase.assignedToUserId, assignee.id))
      .where(where)
      .orderBy(desc(investigationCase.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return {
      items,
      total: totalResult?.count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  }),

  getById: requirePermission("cases:read").input(idSchema).query(async ({ input }) => {
    return getCaseOrThrow(input.id);
  }),

  create: requirePermission("cases:create")
    .input(createCaseSchema)
    .mutation(async ({ ctx, input }) => {
      const created = await insertCaseWithGeneratedNumber({
        caseType: input.caseType,
        title: input.title,
        description: input.description,
        priority: input.priority,
        assignedToUserId: input.assignedToUserId,
        createdByUserId: ctx.session.user.id,
      });

      await recordCaseEvent({
        caseId: created.id,
        eventType: "CASE_CREATED",
        summary: `Case ${created.caseNumber} opened: ${created.title}`,
        payload: { caseType: created.caseType, priority: created.priority },
        actorUserId: ctx.session.user.id,
      });

      return created;
    }),

  update: requirePermission("cases:update")
    .input(updateCaseSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      await getCaseOrThrow(id);

      const [updated] = await db
        .update(investigationCase)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(investigationCase.id, id))
        .returning();
      return updated;
    }),

  // Cases have no deletedAt/hard-delete path by design — POPIA retention and
  // CPA evidentiary requirements mean an opened case is never destroyed.
  // End-of-life is reached via the ARCHIVED status (see updateStatus).
  updateStatus: requirePermission("cases:update")
    .input(updateCaseStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await getCaseOrThrow(input.id);

      const [evidenceCountResult] = await db
        .select({ count: count() })
        .from(caseEvidence)
        .where(eq(caseEvidence.caseId, input.id));

      const transitionError = getCaseStatusTransitionError(existing, input.status, {
        reason: input.reason,
        hasEvidence: (evidenceCountResult?.count ?? 0) > 0,
      });
      if (transitionError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: transitionError });
      }

      const isClosing = input.status === "CLOSED";
      const isReopening = existing.status === "CLOSED" || existing.status === "ARCHIVED";

      const [updated] = await db
        .update(investigationCase)
        .set({
          status: input.status,
          resolutionNotes: isClosing
            ? (input.reason ?? existing.resolutionNotes)
            : existing.resolutionNotes,
          closedAt: isClosing ? new Date() : isReopening ? null : existing.closedAt,
          updatedAt: new Date(),
        })
        .where(eq(investigationCase.id, input.id))
        .returning();

      await db.insert(investigationNote).values({
        caseId: input.id,
        noteType: "STATUS_CHANGE",
        content: `Status changed from ${existing.status} to ${input.status}${
          input.reason ? `: ${input.reason}` : ""
        }`,
        createdByUserId: ctx.session.user.id,
      });

      await recordCaseEvent({
        caseId: input.id,
        eventType: "STATUS_CHANGE",
        summary: `Status changed from ${existing.status} to ${input.status}${
          input.reason ? `: ${input.reason}` : ""
        }`,
        payload: { from: existing.status, to: input.status, reason: input.reason },
        actorUserId: ctx.session.user.id,
      });

      return updated;
    }),

  // --- Sub-resources ---

  listNotes: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ input }) => {
      return db
        .select()
        .from(investigationNote)
        .where(eq(investigationNote.caseId, input.caseId))
        .orderBy(desc(investigationNote.createdAt));
    }),

  addNote: requirePermission("cases:update")
    .input(createInvestigationNoteSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId);
      const [created] = await db
        .insert(investigationNote)
        .values({ ...input, createdByUserId: ctx.session.user.id })
        .returning();

      await recordCaseEvent({
        caseId: input.caseId,
        eventType: "NOTE_ADDED",
        summary: `Note added (${input.noteType}): ${input.content.slice(0, 140)}`,
        payload: { noteType: input.noteType },
        actorUserId: ctx.session.user.id,
      });

      return created;
    }),

  listIncidents: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ input }) => {
      return db
        .select({ incident, linkedAt: caseIncident.linkedAt })
        .from(caseIncident)
        .innerJoin(incident, eq(caseIncident.incidentId, incident.id))
        .where(eq(caseIncident.caseId, input.caseId))
        .orderBy(asc(caseIncident.linkedAt));
    }),

  linkIncident: requirePermission("cases:update")
    .input(linkIncidentSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId);
      await db.insert(caseIncident).values(input).onConflictDoNothing();

      await recordCaseEvent({
        caseId: input.caseId,
        eventType: "INCIDENT_LINKED",
        summary: `Incident ${input.incidentId} linked to case`,
        payload: { incidentId: input.incidentId },
        actorUserId: ctx.session.user.id,
      });

      return { success: true };
    }),

  listEvidence: requirePermission("evidence:read")
    .input(caseIdSchema)
    .query(async ({ input }) => {
      return db
        .select()
        .from(caseEvidence)
        .where(eq(caseEvidence.caseId, input.caseId))
        .orderBy(desc(caseEvidence.createdAt));
    }),

  linkEvidence: requirePermission("evidence:create")
    .input(linkEvidenceSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId);
      const [created] = await db
        .insert(caseEvidence)
        .values({ ...input, createdByUserId: ctx.session.user.id })
        .returning();

      await recordCaseEvent({
        caseId: input.caseId,
        eventType: "EVIDENCE_LINKED",
        summary: `Evidence linked to case (${input.evidenceEntityType})`,
        payload: { evidenceEntityType: input.evidenceEntityType, evidenceEntityId: input.evidenceEntityId },
        actorUserId: ctx.session.user.id,
      });

      return created;
    }),

  // --- Judicial lifecycle: suspects, arrest, prosecution, court hearings ---

  listCriminals: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ input }) => {
      return db
        .select({
          ...getTableColumns(caseCriminal),
          entityDisplayName: entityProfile.displayName,
          entityType: entityProfile.entityType,
        })
        .from(caseCriminal)
        .innerJoin(entityProfile, eq(caseCriminal.entityProfileId, entityProfile.id))
        .where(eq(caseCriminal.caseId, input.caseId))
        .orderBy(desc(caseCriminal.linkedAt));
    }),

  linkCriminal: requirePermission("cases:update")
    .input(linkCaseCriminalSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId);
      const [entity] = await db
        .select({ displayName: entityProfile.displayName })
        .from(entityProfile)
        .where(eq(entityProfile.id, input.entityProfileId))
        .limit(1);

      const [created] = await db
        .insert(caseCriminal)
        .values({ ...input, linkedByUserId: ctx.session.user.id })
        .returning();

      await recordCaseEvent({
        caseId: input.caseId,
        eventType: "CRIMINAL_LINKED",
        summary: `${entity?.displayName ?? "Profile"} linked to case as ${input.role.replace(/_/g, " ").toLowerCase()}`,
        payload: { entityProfileId: input.entityProfileId, role: input.role },
        actorUserId: ctx.session.user.id,
      });

      return created;
    }),

  unlinkCriminal: requirePermission("cases:update")
    .input(caseCriminalIdSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(caseCriminal)
        .where(eq(caseCriminal.id, input.id))
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case criminal link not found" });
      }

      await db.delete(caseCriminal).where(eq(caseCriminal.id, input.id));

      await recordCaseEvent({
        caseId: existing.caseId,
        eventType: "CRIMINAL_UNLINKED",
        summary: `Removed a ${existing.role.replace(/_/g, " ").toLowerCase()} link from the case`,
        payload: { entityProfileId: existing.entityProfileId, role: existing.role },
        actorUserId: ctx.session.user.id,
      });

      return { success: true };
    }),

  listArrests: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ input }) => {
      return db
        .select({
          ...getTableColumns(caseArrest),
          entityDisplayName: entityProfile.displayName,
        })
        .from(caseArrest)
        .innerJoin(entityProfile, eq(caseArrest.entityProfileId, entityProfile.id))
        .where(eq(caseArrest.caseId, input.caseId))
        .orderBy(desc(caseArrest.arrestedAt));
    }),

  recordArrest: requirePermission("cases:update")
    .input(recordCaseArrestSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId);
      const [entity] = await db
        .select({ displayName: entityProfile.displayName })
        .from(entityProfile)
        .where(eq(entityProfile.id, input.entityProfileId))
        .limit(1);

      const [created] = await db
        .insert(caseArrest)
        .values({ ...input, createdByUserId: ctx.session.user.id })
        .returning();

      await recordCaseEvent({
        caseId: input.caseId,
        eventType: "ARREST_RECORDED",
        summary: `${entity?.displayName ?? "Suspect"} arrested ${input.arrestedAt.toLocaleString()}${
          input.withWarrant ? " (with warrant)" : " (without warrant)"
        }`,
        payload: { entityProfileId: input.entityProfileId, withWarrant: input.withWarrant },
        actorUserId: ctx.session.user.id,
      });

      return created;
    }),

  listProsecutionDecisions: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ input }) => {
      return db
        .select()
        .from(caseProsecutionDecision)
        .where(eq(caseProsecutionDecision.caseId, input.caseId))
        .orderBy(desc(caseProsecutionDecision.decidedAt));
    }),

  recordProsecutionDecision: requirePermission("cases:update")
    .input(recordProsecutionDecisionSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId);
      const [created] = await db
        .insert(caseProsecutionDecision)
        .values({ ...input, createdByUserId: ctx.session.user.id })
        .returning();

      await recordCaseEvent({
        caseId: input.caseId,
        eventType: "PROSECUTION_DECISION",
        summary: `NPA decision: ${input.decision.replace(/_/g, " ").toLowerCase()}${
          input.prosecutorName ? ` (${input.prosecutorName})` : ""
        }`,
        payload: { decision: input.decision, reason: input.reason },
        actorUserId: ctx.session.user.id,
      });

      return created;
    }),

  listHearings: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ input }) => {
      return db
        .select()
        .from(caseHearing)
        .where(eq(caseHearing.caseId, input.caseId))
        .orderBy(desc(caseHearing.scheduledAt));
    }),

  scheduleHearing: requirePermission("cases:update")
    .input(scheduleCaseHearingSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId);
      const [created] = await db
        .insert(caseHearing)
        .values({
          ...input,
          // drizzle's numeric() column type is string (arbitrary precision),
          // not JS number.
          bailAmount: input.bailAmount !== undefined ? input.bailAmount.toString() : undefined,
          createdByUserId: ctx.session.user.id,
        })
        .returning();

      await recordCaseEvent({
        caseId: input.caseId,
        eventType: "HEARING_SCHEDULED",
        summary: `${input.hearingType.replace(/_/g, " ").toLowerCase()} scheduled for ${input.scheduledAt.toLocaleString()}${
          input.courtName ? ` at ${input.courtName}` : ""
        }`,
        payload: { hearingType: input.hearingType, scheduledAt: input.scheduledAt },
        actorUserId: ctx.session.user.id,
      });

      return created;
    }),

  recordHearingOutcome: requirePermission("cases:update")
    .input(recordCaseHearingOutcomeSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(caseHearing)
        .where(eq(caseHearing.id, input.id))
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hearing not found" });
      }

      const [updated] = await db
        .update(caseHearing)
        .set({
          outcomeType: input.outcomeType,
          outcomeNotes: input.outcomeNotes,
          nextHearingAt: input.nextHearingAt,
          bailDecision: input.bailDecision ?? existing.bailDecision,
          updatedAt: new Date(),
        })
        .where(eq(caseHearing.id, input.id))
        .returning();

      await recordCaseEvent({
        caseId: existing.caseId,
        eventType: "HEARING_OUTCOME_RECORDED",
        summary: `${existing.hearingType.replace(/_/g, " ").toLowerCase()} outcome: ${input.outcomeType.replace(/_/g, " ").toLowerCase()}${
          input.nextHearingAt ? `, next date ${input.nextHearingAt.toLocaleString()}` : ""
        }`,
        payload: { outcomeType: input.outcomeType, nextHearingAt: input.nextHearingAt },
        actorUserId: ctx.session.user.id,
      });

      return updated;
    }),

  nextActions: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ input }) => {
      const caseRow = await getCaseOrThrow(input.caseId);

      const [arrests, hearings, prosecutionDecisions, evidenceCountResult, criminalsCountResult] =
        await Promise.all([
          db.select().from(caseArrest).where(eq(caseArrest.caseId, input.caseId)),
          db.select().from(caseHearing).where(eq(caseHearing.caseId, input.caseId)),
          db
            .select()
            .from(caseProsecutionDecision)
            .where(eq(caseProsecutionDecision.caseId, input.caseId)),
          db
            .select({ count: count() })
            .from(caseEvidence)
            .where(eq(caseEvidence.caseId, input.caseId)),
          db
            .select({ count: count() })
            .from(caseCriminal)
            .where(eq(caseCriminal.caseId, input.caseId)),
        ]);

      return getCaseNextActions(caseRow, {
        arrests,
        hearings,
        prosecutionDecisions,
        evidenceCount: evidenceCountResult[0]?.count ?? 0,
        criminalsCount: criminalsCountResult[0]?.count ?? 0,
      });
    }),

  // Full case activity feed — every mutating procedure above writes here via
  // services/case-timeline.ts#recordCaseEvent, so this is a straight read.
  timeline: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ input }) => {
      return db
        .select()
        .from(caseTimelineEntry)
        .where(eq(caseTimelineEntry.caseId, input.caseId))
        .orderBy(desc(caseTimelineEntry.occurredAt));
    }),
});
