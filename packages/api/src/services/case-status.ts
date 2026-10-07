import type { investigationCase } from "@Sentinel360/db/schema/cases";

import { caseStatusLabel } from "./case-labels";

export type CaseStatus =
  | "OPEN"
  | "UNDER_INVESTIGATION"
  | "AWAITING_REVIEW"
  | "CLOSED"
  | "ARCHIVED";

// Exported so the web docket can offer only these transitions; this file has
// no runtime imports beyond case-labels, so it is safe in a client bundle.
export const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  OPEN: ["UNDER_INVESTIGATION"],
  UNDER_INVESTIGATION: ["AWAITING_REVIEW"],
  AWAITING_REVIEW: ["CLOSED", "UNDER_INVESTIGATION"],
  CLOSED: ["UNDER_INVESTIGATION", "ARCHIVED"],
  ARCHIVED: ["UNDER_INVESTIGATION"],
};

// POPIA retention: a closed case may only be archived after this long.
export const ARCHIVE_AFTER_MS = 90 * 24 * 60 * 60 * 1000;

type CaseRow = typeof investigationCase.$inferSelect;
// Only the fields the rules read, so the client can pass a serialized row.
type TransitionCaseFields = Pick<CaseRow, "status" | "assignedToUserId" | "resolutionNotes" | "closedAt">;

/**
 * Mirrors docs/03-DOMAIN-MODEL/04-cases-domain.md#state-machines. Returns an
 * error message if the transition is invalid, or null if it may proceed.
 * hasEvidence must be resolved by the caller (requires a DB query).
 */
export function getCaseStatusTransitionError(
  current: TransitionCaseFields,
  next: CaseStatus,
  opts: { reason?: string; hasEvidence: boolean },
): string | null {
  const from = current.status as CaseStatus;

  if (from === next) {
    return null;
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed?.includes(next)) {
    return `A case can't move from "${caseStatusLabel(from)}" to "${caseStatusLabel(next)}"`;
  }

  if (next === "UNDER_INVESTIGATION" && from === "OPEN" && !current.assignedToUserId) {
    return "Case must have an assigned investigator before starting investigation";
  }

  if (next === "AWAITING_REVIEW" && !opts.hasEvidence) {
    return "At least one piece of evidence must be linked before submitting for review";
  }

  if (next === "CLOSED" && !current.resolutionNotes && !opts.reason) {
    return "Closure notes are required to close a case";
  }

  if (
    (from === "AWAITING_REVIEW" || from === "CLOSED" || from === "ARCHIVED") &&
    next === "UNDER_INVESTIGATION" &&
    !opts.reason
  ) {
    return "A reason is required to reopen a case";
  }

  if (from === "CLOSED" && next === "ARCHIVED") {
    if (!current.closedAt) {
      return "Case has no closed_at timestamp";
    }
    const closedForMs = Date.now() - current.closedAt.getTime();
    if (closedForMs < ARCHIVE_AFTER_MS) {
      return "Case must be closed for at least 90 days before archiving";
    }
  }

  return null;
}
