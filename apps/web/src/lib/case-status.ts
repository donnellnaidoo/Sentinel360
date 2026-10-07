import {
  ALLOWED_TRANSITIONS,
  ARCHIVE_AFTER_MS,
  getCaseStatusTransitionError,
} from "@Sentinel360/api/services/case-status";

import { formatDate } from "./format";

// The transition rules are imported from the API, so the buttons offered
// here can't drift from what updateStatus accepts.

export const STATUS_OPTIONS = [
  "OPEN",
  "UNDER_INVESTIGATION",
  "AWAITING_REVIEW",
  "CLOSED",
  "ARCHIVED",
] as const;

export type CaseStatus = (typeof STATUS_OPTIONS)[number];

export const STATUS_LABELS: Record<CaseStatus, string> = {
  OPEN: "Open",
  UNDER_INVESTIGATION: "Under investigation",
  AWAITING_REVIEW: "Awaiting review",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export const STATUS_ICONS: Record<CaseStatus, string> = {
  OPEN: "folder_open",
  UNDER_INVESTIGATION: "search",
  AWAITING_REVIEW: "rate_review",
  CLOSED: "task_alt",
  ARCHIVED: "inventory_2",
};

export const STATUS_STYLES: Record<CaseStatus, string> = {
  OPEN: "bg-primary/10 text-primary",
  UNDER_INVESTIGATION: "bg-tertiary/10 text-tertiary",
  AWAITING_REVIEW: "bg-secondary/10 text-secondary",
  CLOSED: "bg-on-surface-variant/10 text-on-surface-variant",
  ARCHIVED: "bg-on-surface-variant/10 text-on-surface-variant",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as CaseStatus] ?? status;
}

type TransitionKind = "primary" | "secondary" | "destructive";

type TransitionMeta = {
  label: string;
  kind: TransitionKind;
  /** Label for the reason field in the confirm dialog. */
  reasonLabel: string;
  /** One sentence on what happens, shown before confirming. */
  consequence: string;
};

const TRANSITION_META: Record<string, TransitionMeta> = {
  "OPEN->UNDER_INVESTIGATION": {
    label: "Start investigation",
    kind: "primary",
    reasonLabel: "Note (optional)",
    consequence: "The lead investigator begins working the docket.",
  },
  "UNDER_INVESTIGATION->AWAITING_REVIEW": {
    label: "Submit docket for review",
    kind: "primary",
    reasonLabel: "Note for the reviewer (optional)",
    consequence: "The docket goes to review and can then be referred to the prosecutor.",
  },
  "AWAITING_REVIEW->CLOSED": {
    label: "Close case",
    kind: "destructive",
    reasonLabel: "Closure notes",
    consequence: "Sets the closed date. The case can be archived 90 days later, or reopened with a reason.",
  },
  "AWAITING_REVIEW->UNDER_INVESTIGATION": {
    label: "Return to investigation",
    kind: "secondary",
    reasonLabel: "Reason for returning",
    consequence: "The docket goes back to the investigator for more work.",
  },
  "CLOSED->ARCHIVED": {
    label: "Archive case",
    kind: "destructive",
    reasonLabel: "Note (optional)",
    consequence: "Moves the case into long-term retention. It can still be reopened with a reason.",
  },
  "CLOSED->UNDER_INVESTIGATION": {
    label: "Reopen case",
    kind: "secondary",
    reasonLabel: "Reason for reopening",
    consequence: "Clears the closed date and puts the case back under investigation.",
  },
  "ARCHIVED->UNDER_INVESTIGATION": {
    label: "Reopen archived case",
    kind: "secondary",
    reasonLabel: "Reason for reopening",
    consequence: "Brings the case out of retention and back under investigation.",
  },
};

export type AvailableTransition = TransitionMeta & {
  to: CaseStatus;
  reasonRequired: boolean;
  /** Why the transition can't happen yet, or null if it can. */
  blockedReason: string | null;
};

type CaseFields = {
  status: string;
  assignedToUserId: string | null;
  resolutionNotes: string | null;
  closedAt: string | Date | null;
};

export function getAvailableTransitions(
  caseRow: CaseFields,
  opts: { evidenceCount: number },
): AvailableTransition[] {
  const from = caseRow.status as CaseStatus;
  const current = {
    status: caseRow.status,
    assignedToUserId: caseRow.assignedToUserId,
    resolutionNotes: caseRow.resolutionNotes,
    closedAt: caseRow.closedAt ? new Date(caseRow.closedAt) : null,
  };
  const hasEvidence = opts.evidenceCount > 0;

  return (ALLOWED_TRANSITIONS[from] ?? []).map((to) => {
    const meta = TRANSITION_META[`${from}->${to}`] ?? {
      label: STATUS_LABELS[to],
      kind: "secondary" as const,
      reasonLabel: "Reason",
      consequence: "",
    };
    // Ask the API's rule with and without a reason: if it only passes with
    // one, the reason is required; anything else blocking is a precondition.
    const withReason = getCaseStatusTransitionError(current, to, { reason: "x", hasEvidence });
    const withoutReason = getCaseStatusTransitionError(current, to, { hasEvidence });
    let blockedReason = withReason;
    if (blockedReason && from === "CLOSED" && to === "ARCHIVED" && current.closedAt) {
      blockedReason = `Can be archived from ${formatDate(current.closedAt.getTime() + ARCHIVE_AFTER_MS)} (90-day POPIA retention period)`;
    }
    return {
      ...meta,
      to,
      reasonRequired: !withReason && !!withoutReason,
      blockedReason,
    };
  });
}

export const LIFECYCLE_STEPS: CaseStatus[] = ["OPEN", "UNDER_INVESTIGATION", "AWAITING_REVIEW", "CLOSED"];
