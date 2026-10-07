import type { caseArrest, caseHearing, caseProsecutionDecision, investigationCase } from "@Sentinel360/db/schema/cases";

type CaseRow = typeof investigationCase.$inferSelect;
type CaseArrestRow = typeof caseArrest.$inferSelect;
type CaseHearingRow = typeof caseHearing.$inferSelect;
type CaseProsecutionDecisionRow = typeof caseProsecutionDecision.$inferSelect;

export type NextActionSeverity = "info" | "attention" | "overdue";

// Stable identifiers the docket UI maps to the tab/form that performs the
// step — labels are display copy and may change, codes must not.
export type NextActionCode =
  | "ASSIGN_INVESTIGATOR"
  | "LOG_EVIDENCE"
  | "LINK_PERSON"
  | "CONSIDER_ARREST"
  | "SCHEDULE_FIRST_APPEARANCE"
  | "AWAIT_PROSECUTION_DECISION"
  | "REFER_TO_PROSECUTOR"
  | "RECORD_HEARING_OUTCOME"
  | "SCHEDULE_NEXT_HEARING";

export interface CaseNextAction {
  code: NextActionCode;
  label: string;
  severity: NextActionSeverity;
  dueAt?: Date;
  /** The hearing the action refers to, for hearing-specific steps. */
  targetId?: string;
}

export interface CaseNextActionsContext {
  arrests: CaseArrestRow[];
  hearings: CaseHearingRow[];
  prosecutionDecisions: CaseProsecutionDecisionRow[];
  evidenceCount: number;
  criminalsCount: number;
}

// South Africa's Criminal Procedure Act 51/1977 s50 requires an arrested
// person be brought before a court "as soon as reasonably possible", which
// in practice (and per SAPS guidance) means within 48 hours of arrest.
const FIRST_APPEARANCE_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Rule-based "what to do next" checklist for a case, derived from its
 * current lifecycle records rather than stored anywhere. Mirrors the real
 * investigation -> arrest -> first appearance -> prosecution -> trial
 * sequence researched for the docket rebuild (see the case-tab plan).
 */
export function getCaseNextActions(
  caseRow: CaseRow,
  ctx: CaseNextActionsContext,
): CaseNextAction[] {
  if (caseRow.status === "ARCHIVED") {
    return [];
  }

  const actions: CaseNextAction[] = [];
  const now = Date.now();
  // Investigation nudges stop once the case is closed; court follow-ups
  // (outcomes, next hearing dates) still apply until it is archived.
  const isInvestigating = caseRow.status !== "CLOSED";

  if (!caseRow.assignedToUserId && isInvestigating) {
    actions.push({
      code: "ASSIGN_INVESTIGATOR",
      label: "Assign an investigating officer",
      severity: "attention",
    });
  }

  if (ctx.evidenceCount === 0 && isInvestigating) {
    actions.push({
      code: "LOG_EVIDENCE",
      label: "Log evidence before submitting the docket for review",
      severity: "info",
    });
  }

  if (isInvestigating) {
    if (ctx.criminalsCount === 0) {
      actions.push({
        code: "LINK_PERSON",
        label: "Link a suspect, witness, or victim once identified",
        severity: "info",
      });
    } else if (ctx.arrests.length === 0) {
      actions.push({
        code: "CONSIDER_ARREST",
        label: "Consider arrest or continued surveillance of the identified suspect",
        severity: "info",
      });
    }
  }

  const latestArrest = ctx.arrests.reduce<CaseArrestRow | undefined>(
    (latest, arrest) =>
      !latest || arrest.arrestedAt.getTime() > latest.arrestedAt.getTime() ? arrest : latest,
    undefined,
  );
  const firstAppearance = ctx.hearings.find((h) => h.hearingType === "FIRST_APPEARANCE");

  if (latestArrest && !firstAppearance) {
    const dueAt = new Date(latestArrest.arrestedAt.getTime() + FIRST_APPEARANCE_WINDOW_MS);
    actions.push({
      code: "SCHEDULE_FIRST_APPEARANCE",
      label: "Schedule first appearance — required within 48 hours of arrest (s50 CPA)",
      severity: now > dueAt.getTime() ? "overdue" : "attention",
      dueAt,
    });
  }

  // Both point at the same decision form, so only one is ever shown: once
  // the docket is with review, "refer to the prosecutor" is the clearer ask.
  if (caseRow.status === "AWAITING_REVIEW" && ctx.prosecutionDecisions.length === 0) {
    actions.push({
      code: "REFER_TO_PROSECUTOR",
      label: "Refer docket to the prosecutor for a charge decision",
      severity: "attention",
    });
  } else if (firstAppearance && ctx.prosecutionDecisions.length === 0) {
    actions.push({
      code: "AWAIT_PROSECUTION_DECISION",
      label: "Awaiting NPA charge decision on the docket",
      severity: "attention",
    });
  }

  for (const hearing of ctx.hearings) {
    if (hearing.outcomeType === "PENDING" && hearing.scheduledAt.getTime() < now) {
      // No date in the label: the client formats dueAt in the user's
      // timezone; a server-formatted date here would be in the host's.
      actions.push({
        code: "RECORD_HEARING_OUTCOME",
        label: `Record the outcome of the ${hearing.hearingType.replace(/_/g, " ").toLowerCase()}`,
        severity: "overdue",
        dueAt: hearing.scheduledAt,
        targetId: hearing.id,
      });
      continue;
    }

    if (hearing.nextHearingAt && hearing.nextHearingAt.getTime() < now) {
      const followUpScheduled = ctx.hearings.some(
        (h) => h.id !== hearing.id && h.scheduledAt.getTime() >= hearing.nextHearingAt!.getTime(),
      );
      if (!followUpScheduled) {
        actions.push({
          code: "SCHEDULE_NEXT_HEARING",
          label: "Schedule the next hearing date carried over from the last postponement",
          severity: "overdue",
          dueAt: hearing.nextHearingAt,
          targetId: hearing.id,
        });
      }
    }
  }

  return actions;
}
