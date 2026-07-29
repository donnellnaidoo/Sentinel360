// Mirrors packages/api/src/services/case-status.ts. Single source of truth
// for the frontend so cases/page.tsx and docket/[docketId]/page.tsx can't
// drift out of sync with each other — the backend transition guard is still
// the actual source of truth for what's allowed.

export const STATUS_OPTIONS = [
  "OPEN",
  "UNDER_INVESTIGATION",
  "AWAITING_REVIEW",
  "CLOSED",
  "ARCHIVED",
] as const;

export type CaseStatus = (typeof STATUS_OPTIONS)[number];

export const STATUS_STYLES: Record<CaseStatus, string> = {
  OPEN: "bg-primary/10 text-primary",
  UNDER_INVESTIGATION: "bg-tertiary/10 text-tertiary",
  AWAITING_REVIEW: "bg-secondary/10 text-secondary",
  CLOSED: "bg-on-surface-variant/10 text-on-surface-variant",
  ARCHIVED: "bg-on-surface-variant/10 text-on-surface-variant",
};
