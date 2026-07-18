import type { caseArrest, caseHearing, caseProsecutionDecision, investigationCase } from "@Sentinel360/db/schema/cases";

type CaseRow = typeof investigationCase.$inferSelect;
type CaseArrestRow = typeof caseArrest.$inferSelect;
type CaseHearingRow = typeof caseHearing.$inferSelect;
type CaseProsecutionDecisionRow = typeof caseProsecutionDecision.$inferSelect;

export type NextActionSeverity = "info" | "attention" | "overdue";

export interface CaseNextAction {
  label: string;
  severity: NextActionSeverity;
  dueAt?: Date;
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

  if (!caseRow.assignedToUserId) {
    actions.push({ label: "Assign an investigating officer", severity: "attention" });
  }

  if (ctx.evidenceCount === 0) {
    actions.push({
      label: "Log evidence before submitting the docket for review",
      severity: "info",
    });
  }

  if (ctx.criminalsCount === 0) {
    actions.push({
      label: "Link a suspect, witness, or victim once identified",
      severity: "info",
    });
  } else if (ctx.arrests.length === 0) {
    actions.push({
      label: "Consider arrest or continued surveillance of the identified suspect",
      severity: "info",
    });
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
      label: "Schedule first appearance — required within 48 hours of arrest (s50 CPA)",
      severity: now > dueAt.getTime() ? "overdue" : "attention",
      dueAt,
    });
  }

  if (firstAppearance && ctx.prosecutionDecisions.length === 0) {
    actions.push({
      label: "Awaiting NPA charge decision on the docket",
      severity: "attention",
    });
  }

  if (caseRow.status === "AWAITING_REVIEW" && ctx.prosecutionDecisions.length === 0) {
    actions.push({
      label: "Refer docket to the prosecutor for a charge decision",
      severity: "attention",
    });
  }

  for (const hearing of ctx.hearings) {
    if (hearing.outcomeType === "PENDING" && hearing.scheduledAt.getTime() < now) {
      actions.push({
        label: `Record the outcome of the ${hearing.hearingType.replace(/_/g, " ").toLowerCase()} held ${hearing.scheduledAt.toLocaleDateString()}`,
        severity: "overdue",
        dueAt: hearing.scheduledAt,
      });
      continue;
    }

    if (hearing.nextHearingAt && hearing.nextHearingAt.getTime() < now) {
      const followUpScheduled = ctx.hearings.some(
        (h) => h.id !== hearing.id && h.scheduledAt.getTime() >= hearing.nextHearingAt!.getTime(),
      );
      if (!followUpScheduled) {
        actions.push({
          label: "Schedule the next hearing date carried over from the last postponement",
          severity: "overdue",
          dueAt: hearing.nextHearingAt,
        });
      }
    }
  }

  return actions;
}
