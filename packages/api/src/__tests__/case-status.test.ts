import { describe, expect, it } from "vitest";

import { getCaseStatusTransitionError, type CaseStatus } from "../services/case-status";

import type { investigationCase } from "@Sentinel360/db/schema/cases";

type CaseRow = typeof investigationCase.$inferSelect;

function makeCase(overrides: Partial<CaseRow> = {}): CaseRow {
  return {
    status: "OPEN",
    assignedToUserId: null,
    resolutionNotes: null,
    closedAt: null,
    ...overrides,
  } as unknown as CaseRow;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe("getCaseStatusTransitionError", () => {
  it("allows a no-op transition to the same status", () => {
    const current = makeCase({ status: "UNDER_INVESTIGATION" });
    expect(getCaseStatusTransitionError(current, "UNDER_INVESTIGATION", { hasEvidence: false })).toBeNull();
  });

  it("rejects a transition not in the allowed map (OPEN -> CLOSED)", () => {
    const current = makeCase({ status: "OPEN" });
    const error = getCaseStatusTransitionError(current, "CLOSED", { hasEvidence: true });
    expect(error).toBe('A case can\'t move from "Open" to "Closed"');
  });

  it("rejects a transition not in the allowed map (OPEN -> ARCHIVED)", () => {
    const current = makeCase({ status: "OPEN" });
    const error = getCaseStatusTransitionError(current, "ARCHIVED", { hasEvidence: true });
    expect(error).toBe('A case can\'t move from "Open" to "Archived"');
  });

  it("rejects OPEN -> UNDER_INVESTIGATION without an assigned investigator", () => {
    const current = makeCase({ status: "OPEN", assignedToUserId: null });
    const error = getCaseStatusTransitionError(current, "UNDER_INVESTIGATION", { hasEvidence: false });
    expect(error).toBe("Case must have an assigned investigator before starting investigation");
  });

  it("allows OPEN -> UNDER_INVESTIGATION with an assigned investigator", () => {
    const current = makeCase({ status: "OPEN", assignedToUserId: "u1" });
    const error = getCaseStatusTransitionError(current, "UNDER_INVESTIGATION", { hasEvidence: false });
    expect(error).toBeNull();
  });

  it("rejects UNDER_INVESTIGATION -> AWAITING_REVIEW without evidence", () => {
    const current = makeCase({ status: "UNDER_INVESTIGATION" });
    const error = getCaseStatusTransitionError(current, "AWAITING_REVIEW", { hasEvidence: false });
    expect(error).toBe("At least one piece of evidence must be linked before submitting for review");
  });

  it("allows UNDER_INVESTIGATION -> AWAITING_REVIEW with evidence", () => {
    const current = makeCase({ status: "UNDER_INVESTIGATION" });
    const error = getCaseStatusTransitionError(current, "AWAITING_REVIEW", { hasEvidence: true });
    expect(error).toBeNull();
  });

  it("rejects AWAITING_REVIEW -> CLOSED without resolution notes or a reason", () => {
    const current = makeCase({ status: "AWAITING_REVIEW", resolutionNotes: null });
    const error = getCaseStatusTransitionError(current, "CLOSED", { hasEvidence: true });
    expect(error).toBe("Closure notes are required to close a case");
  });

  it("allows AWAITING_REVIEW -> CLOSED when resolutionNotes is already set", () => {
    const current = makeCase({ status: "AWAITING_REVIEW", resolutionNotes: "Resolved via arrest" });
    const error = getCaseStatusTransitionError(current, "CLOSED", { hasEvidence: true });
    expect(error).toBeNull();
  });

  it("allows AWAITING_REVIEW -> CLOSED when a reason is passed instead of stored notes", () => {
    const current = makeCase({ status: "AWAITING_REVIEW", resolutionNotes: null });
    const error = getCaseStatusTransitionError(current, "CLOSED", { hasEvidence: true, reason: "Closed by consent" });
    expect(error).toBeNull();
  });

  it("rejects AWAITING_REVIEW -> UNDER_INVESTIGATION (reopen) without a reason", () => {
    const current = makeCase({ status: "AWAITING_REVIEW" });
    const error = getCaseStatusTransitionError(current, "UNDER_INVESTIGATION", { hasEvidence: true });
    expect(error).toBe("A reason is required to reopen a case");
  });

  it("allows AWAITING_REVIEW -> UNDER_INVESTIGATION (reopen) with a reason", () => {
    const current = makeCase({ status: "AWAITING_REVIEW" });
    const error = getCaseStatusTransitionError(current, "UNDER_INVESTIGATION", {
      hasEvidence: true,
      reason: "New evidence surfaced",
    });
    expect(error).toBeNull();
  });

  it("rejects CLOSED -> UNDER_INVESTIGATION (reopen) without a reason", () => {
    const current = makeCase({ status: "CLOSED" });
    const error = getCaseStatusTransitionError(current, "UNDER_INVESTIGATION", { hasEvidence: true });
    expect(error).toBe("A reason is required to reopen a case");
  });

  it("allows CLOSED -> UNDER_INVESTIGATION (reopen) with a reason", () => {
    const current = makeCase({ status: "CLOSED" });
    const error = getCaseStatusTransitionError(current, "UNDER_INVESTIGATION", {
      hasEvidence: true,
      reason: "Appeal filed",
    });
    expect(error).toBeNull();
  });

  it("rejects ARCHIVED -> UNDER_INVESTIGATION (reopen) without a reason", () => {
    const current = makeCase({ status: "ARCHIVED" });
    const error = getCaseStatusTransitionError(current, "UNDER_INVESTIGATION", { hasEvidence: true });
    expect(error).toBe("A reason is required to reopen a case");
  });

  it("allows ARCHIVED -> UNDER_INVESTIGATION (reopen) with a reason", () => {
    const current = makeCase({ status: "ARCHIVED" });
    const error = getCaseStatusTransitionError(current, "UNDER_INVESTIGATION", {
      hasEvidence: true,
      reason: "Cold case reopened on new tip",
    });
    expect(error).toBeNull();
  });

  it("rejects CLOSED -> ARCHIVED when closedAt is missing", () => {
    const current = makeCase({ status: "CLOSED", closedAt: null });
    const error = getCaseStatusTransitionError(current, "ARCHIVED", { hasEvidence: true });
    expect(error).toBe("Case has no closed_at timestamp");
  });

  it("rejects CLOSED -> ARCHIVED when closed fewer than 90 days ago", () => {
    const current = makeCase({ status: "CLOSED", closedAt: daysAgo(10) });
    const error = getCaseStatusTransitionError(current, "ARCHIVED", { hasEvidence: true });
    expect(error).toBe("Case must be closed for at least 90 days before archiving");
  });

  it("allows CLOSED -> ARCHIVED when closed more than 90 days ago", () => {
    const current = makeCase({ status: "CLOSED", closedAt: daysAgo(91) });
    const error = getCaseStatusTransitionError(current, "ARCHIVED", { hasEvidence: true });
    expect(error).toBeNull();
  });

  it("treats a case closed just under 90 days ago as not yet archivable", () => {
    const justUnderNinetyDays = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000 - 60_000));
    const current = makeCase({ status: "CLOSED", closedAt: justUnderNinetyDays });
    const error = getCaseStatusTransitionError(current, "ARCHIVED", { hasEvidence: true });
    expect(error).toBe("Case must be closed for at least 90 days before archiving");
  });

  it("rejects an unrecognized target status not present in the transition map", () => {
    const current = makeCase({ status: "OPEN" });
    const error = getCaseStatusTransitionError(current, "NOT_A_STATUS" as CaseStatus, { hasEvidence: false });
    expect(error).toBe('A case can\'t move from "Open" to "not a status"');
  });
});
