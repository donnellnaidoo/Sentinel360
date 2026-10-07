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
import { role, userRole } from "@Sentinel360/db/schema/rbac";
import { TRPCError } from "@trpc/server";
import { alias } from "drizzle-orm/pg-core";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";

const assignee = alias(user, "assignee");

import { requirePermission, router, superAdminProcedure } from "../index";
import {
  assignCaseInvestigatorSchema,
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
import {
  canViewSensitiveCase,
  getCaseOrThrow,
  PRIVILEGED_ROLES,
  type ViewerCtx,
} from "../services/case-access";
import { caseStatusLabel, formatSAST, humanizeEnum } from "../services/case-labels";
import { sweepCaseRetention } from "../services/retention";

function pushIf<T>(arr: T[], item: T | undefined): void {
  if (item !== undefined) {
    arr.push(item);
  }
}

// Domain doc invariant: "only users with law_enforcement role or higher can
// be assigned as investigators." security_operator and community are
// excluded — they can work a case (notes, evidence) but don't lead one.
const ASSIGNABLE_INVESTIGATOR_ROLES = ["investigator", "law_enforcement", "admin", "super_admin"];

function sensitiveCaseVisibilityCondition(ctx: ViewerCtx): SQL | undefined {
  const { id, roles } = ctx.session.user;
  if (roles.some((r) => PRIVILEGED_ROLES.includes(r))) {
    return undefined;
  }
  return or(eq(investigationCase.isSensitive, false), eq(investigationCase.assignedToUserId, id));
}

async function assertEligibleInvestigatorRole(userId: string): Promise<void> {
  const [match] = await db
    .select({ userId: userRole.userId })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(and(eq(userRole.userId, userId), inArray(role.code, ASSIGNABLE_INVESTIGATOR_ROLES)))
    .limit(1);
  if (!match) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Target user does not have an eligible investigator role (investigator, law_enforcement, admin, or super_admin)",
    });
  }
}

export const casesRouter = router({
  list: requirePermission("cases:read").input(caseListSchema).query(async ({ ctx, input }) => {
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
    pushIf(conditions, sensitiveCaseVisibilityCondition(ctx));

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

  getById: requirePermission("cases:read").input(idSchema).query(async ({ ctx, input }) => {
    const caseRow = await getCaseOrThrow(input.id, ctx);
    if (!caseRow.assignedToUserId) {
      return { ...caseRow, assignedToName: null };
    }
    const [assignedUser] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, caseRow.assignedToUserId))
      .limit(1);
    return { ...caseRow, assignedToName: assignedUser?.name ?? null };
  }),

  create: requirePermission("cases:create")
    .input(createCaseSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.assignedToUserId) {
        await assertEligibleInvestigatorRole(input.assignedToUserId);
      }

      const created = await insertCaseWithGeneratedNumber({
        caseType: input.caseType,
        title: input.title,
        description: input.description,
        priority: input.priority,
        assignedToUserId: input.assignedToUserId,
        isSensitive: input.isSensitive,
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
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const existing = await getCaseOrThrow(id, ctx);

      const sensitiveChanged =
        updateData.isSensitive !== undefined && updateData.isSensitive !== existing.isSensitive;
      const nextAssignee =
        updateData.assignedToUserId !== undefined
          ? updateData.assignedToUserId
          : existing.assignedToUserId;
      // Flagging a case sensitive hides it from everyone but its investigator
      // and admins — refuse a change that would lock the actor out mid-edit.
      if ((updateData.isSensitive ?? existing.isSensitive) &&
        !canViewSensitiveCase({ assignedToUserId: nextAssignee }, ctx)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Only the assigned investigator or an administrator can mark this case sensitive — you would lose access to it",
        });
      }

      const [updated] = await db
        .update(investigationCase)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(investigationCase.id, id))
        .returning();

      if (sensitiveChanged) {
        await recordCaseEvent({
          caseId: id,
          eventType: "SENSITIVITY_CHANGED",
          summary: updateData.isSensitive
            ? "Case marked sensitive — restricted to the assigned investigator and administrators"
            : "Sensitive restriction removed — case visible to all case readers",
          payload: { isSensitive: updateData.isSensitive },
          actorUserId: ctx.session.user.id,
        });
      }

      return updated;
    }),

  // Cases have no deletedAt/hard-delete path by design — POPIA retention and
  // CPA evidentiary requirements mean an opened case is never destroyed.
  // End-of-life is reached via the ARCHIVED status (see updateStatus).
  updateStatus: requirePermission("cases:update")
    .input(updateCaseStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await getCaseOrThrow(input.id, ctx);

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

      const statusSummary = `Status changed from ${caseStatusLabel(existing.status)} to ${caseStatusLabel(input.status)}${
        input.reason ? `: ${input.reason}` : ""
      }`;

      await db.insert(investigationNote).values({
        caseId: input.id,
        noteType: "STATUS_CHANGE",
        content: statusSummary,
        createdByUserId: ctx.session.user.id,
      });

      await recordCaseEvent({
        caseId: input.id,
        eventType: "STATUS_CHANGE",
        summary: statusSummary,
        payload: { from: existing.status, to: input.status, reason: input.reason },
        actorUserId: ctx.session.user.id,
      });

      return updated;
    }),

  // --- Sub-resources ---

  listNotes: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
      return db
        .select({ ...getTableColumns(investigationNote), authorName: user.name })
        .from(investigationNote)
        .leftJoin(user, eq(investigationNote.createdByUserId, user.id))
        .where(eq(investigationNote.caseId, input.caseId))
        .orderBy(desc(investigationNote.createdAt));
    }),

  addNote: requirePermission("cases:update")
    .input(createInvestigationNoteSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
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
    .query(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
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
      await getCaseOrThrow(input.caseId, ctx);
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
    .query(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
      return db
        .select()
        .from(caseEvidence)
        .where(eq(caseEvidence.caseId, input.caseId))
        .orderBy(desc(caseEvidence.createdAt));
    }),

  linkEvidence: requirePermission("evidence:create")
    .input(linkEvidenceSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
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
    .query(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
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
      await getCaseOrThrow(input.caseId, ctx);
      const [entity] = await db
        .select({ displayName: entityProfile.displayName })
        .from(entityProfile)
        .where(eq(entityProfile.id, input.entityProfileId))
        .limit(1);

      const [duplicate] = await db
        .select({ id: caseCriminal.id })
        .from(caseCriminal)
        .where(
          and(
            eq(caseCriminal.caseId, input.caseId),
            eq(caseCriminal.entityProfileId, input.entityProfileId),
            eq(caseCriminal.role, input.role),
          ),
        )
        .limit(1);
      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${entity?.displayName ?? "This profile"} is already linked to this case as ${humanizeEnum(input.role)}`,
        });
      }

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
      await getCaseOrThrow(existing.caseId, ctx);

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
    .query(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
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
      await getCaseOrThrow(input.caseId, ctx);

      // An arrest must be of someone this case already treats as a suspect —
      // never a linked witness or victim.
      const [suspectLink] = await db
        .select({ id: caseCriminal.id })
        .from(caseCriminal)
        .where(
          and(
            eq(caseCriminal.caseId, input.caseId),
            eq(caseCriminal.entityProfileId, input.entityProfileId),
            inArray(caseCriminal.role, ["SUSPECT", "PERSON_OF_INTEREST", "ARRESTED"]),
          ),
        )
        .limit(1);
      if (!suspectLink) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only a person linked to this case as a suspect or person of interest can be arrested",
        });
      }
      if (input.arrestedAt.getTime() > Date.now() + 60_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The arrest time can't be in the future" });
      }
      if (input.rightsInformedAt && input.rightsInformedAt.getTime() < input.arrestedAt.getTime()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rights can't have been explained before the arrest time",
        });
      }
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
        summary: `${entity?.displayName ?? "Suspect"} arrested ${formatSAST(input.arrestedAt)}${
          input.withWarrant ? " (with warrant)" : " (without warrant)"
        }`,
        payload: { entityProfileId: input.entityProfileId, withWarrant: input.withWarrant },
        actorUserId: ctx.session.user.id,
      });

      return created;
    }),

  listProsecutionDecisions: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
      return db
        .select()
        .from(caseProsecutionDecision)
        .where(eq(caseProsecutionDecision.caseId, input.caseId))
        .orderBy(desc(caseProsecutionDecision.decidedAt));
    }),

  recordProsecutionDecision: requirePermission("cases:update")
    .input(recordProsecutionDecisionSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
      if (input.decidedAt && input.decidedAt.getTime() > Date.now() + 60_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The decision date can't be in the future" });
      }
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
    .query(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
      return db
        .select()
        .from(caseHearing)
        .where(eq(caseHearing.caseId, input.caseId))
        .orderBy(desc(caseHearing.scheduledAt));
    }),

  scheduleHearing: requirePermission("cases:update")
    .input(scheduleCaseHearingSchema)
    .mutation(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
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
        summary: `${input.hearingType.replace(/_/g, " ").toLowerCase()} scheduled for ${formatSAST(input.scheduledAt)}${
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
      await getCaseOrThrow(existing.caseId, ctx);

      // A result (verdict, sentence, "proceeded", struck off) can only be
      // recorded once the hearing has actually taken place. Postponement and
      // withdrawal can legitimately be arranged beforehand.
      const RESULT_OUTCOMES = ["PROCEEDED", "GUILTY", "NOT_GUILTY", "SENTENCED", "STRUCK_OFF_ROLL"];
      if (RESULT_OUTCOMES.includes(input.outcomeType) && existing.scheduledAt.getTime() > Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This hearing is scheduled for ${formatSAST(existing.scheduledAt)} — its result can only be recorded after it has taken place`,
        });
      }
      if (input.outcomeType === "POSTPONED") {
        if (!input.nextHearingAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A postponed hearing needs the next court date" });
        }
        if (input.nextHearingAt.getTime() <= existing.scheduledAt.getTime()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The next court date must be after this hearing's date",
          });
        }
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
          input.nextHearingAt ? `, next date ${formatSAST(input.nextHearingAt)}` : ""
        }`,
        payload: { outcomeType: input.outcomeType, nextHearingAt: input.nextHearingAt },
        actorUserId: ctx.session.user.id,
      });

      return updated;
    }),

  nextActions: requirePermission("cases:read")
    .input(caseIdSchema)
    .query(async ({ ctx, input }) => {
      const caseRow = await getCaseOrThrow(input.caseId, ctx);

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
    .query(async ({ ctx, input }) => {
      await getCaseOrThrow(input.caseId, ctx);
      return db
        .select({ ...getTableColumns(caseTimelineEntry), actorName: user.name })
        .from(caseTimelineEntry)
        .leftJoin(user, eq(caseTimelineEntry.actorUserId, user.id))
        .where(eq(caseTimelineEntry.caseId, input.caseId))
        .orderBy(desc(caseTimelineEntry.occurredAt));
    }),

  // Users eligible to lead a case (ASSIGNABLE_INVESTIGATOR_ROLES).
  // Deliberately narrower than users.list (admin-only, exposes account
  // management fields) — anyone who can update a case can see this list,
  // since picking an assignee is part of ordinary casework.
  listAssignableInvestigators: requirePermission("cases:update").query(async () => {
    const roleMatches = await db
      .select({ userId: userRole.userId })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(inArray(role.code, ASSIGNABLE_INVESTIGATOR_ROLES));

    const userIds = [...new Set(roleMatches.map((r) => r.userId))];
    if (userIds.length === 0) {
      return [];
    }

    return db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(and(inArray(user.id, userIds), eq(user.isActive, true), isNull(user.deletedAt)))
      .orderBy(asc(user.name));
  }),

  // Dedicated endpoint rather than routing assignment through the generic
  // `update` — that silently overwrote assignedToUserId with no role check
  // and no timeline/audit entry, unlike every other case mutation below.
  // userId: null unassigns.
  assignInvestigator: requirePermission("cases:update")
    .input(assignCaseInvestigatorSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await getCaseOrThrow(input.caseId, ctx);

      // Under investigation / awaiting review both require a lead
      // investigator (see case-status.ts), so they can be reassigned but not
      // left without one.
      if (!input.userId && (existing.status === "UNDER_INVESTIGATION" || existing.status === "AWAITING_REVIEW")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A case that is ${caseStatusLabel(existing.status).toLowerCase()} must keep a lead investigator — reassign it instead`,
        });
      }
      if (existing.isSensitive && !canViewSensitiveCase({ assignedToUserId: input.userId }, ctx)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This case is sensitive — reassigning it away from yourself would remove your access. Ask an administrator.",
        });
      }

      let assigneeName: string | null = null;
      if (input.userId) {
        await assertEligibleInvestigatorRole(input.userId);
        const [targetUser] = await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, input.userId))
          .limit(1);
        assigneeName = targetUser?.name ?? null;
      }

      const [updated] = await db
        .update(investigationCase)
        .set({ assignedToUserId: input.userId, updatedAt: new Date() })
        .where(eq(investigationCase.id, input.caseId))
        .returning();

      await recordCaseEvent({
        caseId: input.caseId,
        eventType: input.userId ? "INVESTIGATOR_ASSIGNED" : "INVESTIGATOR_UNASSIGNED",
        summary: input.userId
          ? `${assigneeName ?? "Investigator"} assigned as lead investigator${
              existing.assignedToUserId ? " (reassigned)" : ""
            }`
          : "Investigator unassigned",
        payload: { previousUserId: existing.assignedToUserId, newUserId: input.userId },
        actorUserId: ctx.session.user.id,
      });

      return { ...updated, assignedToName: assigneeName };
    }),

  // POPIA condition 4 (retention limitation): batch-archives every CLOSED
  // case that's past the 90-day cutoff. System-wide operational action, not
  // routine casework, so it's gated by role rather than a cases:* permission
  // (matches settings.ts's use of superAdminProcedure for the same reason).
  // Run this periodically until a real job scheduler exists — see
  // services/retention.ts for why it isn't self-scheduling.
  runRetentionSweep: superAdminProcedure.mutation(async ({ ctx }) => {
    return sweepCaseRetention(ctx.session.user.id);
  }),
});
