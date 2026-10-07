// Human-readable text for values written into case notes and timeline
// summaries. Those summaries are stored and shown verbatim, so they must not
// contain raw enum codes (UNDER_INVESTIGATION) or server-local timestamps.

export const CASE_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  UNDER_INVESTIGATION: "Under investigation",
  AWAITING_REVIEW: "Awaiting review",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

/** Fallback for enums without an explicit label: SCHEDULE_5 -> "schedule 5". */
export function humanizeEnum(value: string): string {
  return value.replace(/_/g, " ").toLowerCase();
}

export function caseStatusLabel(status: string): string {
  return CASE_STATUS_LABELS[status] ?? humanizeEnum(status);
}

// SAPS dockets run on South African time; the server may well be on UTC, so
// never format with the host's locale/timezone defaults.
const SAST_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

export function formatSAST(date: Date): string {
  return SAST_FORMAT.format(date);
}
