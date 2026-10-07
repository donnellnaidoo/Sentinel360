import { describe, expect, it } from "vitest";

import { getCaseNextActions, type CaseNextActionsContext } from "../services/case-next-actions";

import type { caseArrest, caseHearing, caseProsecutionDecision, investigationCase } from "@Sentinel360/db/schema/cases";

type CaseRow = typeof investigationCase.$inferSelect;
type CaseArrestRow = typeof caseArrest.$inferSelect;
type CaseHearingRow = typeof caseHearing.$inferSelect;
type CaseProsecutionDecisionRow = typeof caseProsecutionDecision.$inferSelect;

function makeCase(overrides: Partial<CaseRow> = {}): CaseRow {
  return {
    status: "UNDER_INVESTIGATION",
    assignedToUserId: "u1",
    ...overrides,
  } as unknown as CaseRow;
}

function makeArrest(overrides: Partial<CaseArrestRow> = {}): CaseArrestRow {
  return {
    id: "arrest-1",
    arrestedAt: new Date(),
    ...overrides,
  } as unknown as CaseArrestRow;
}

function makeHearing(overrides: Partial<CaseHearingRow> = {}): CaseHearingRow {
  return {
    id: "hearing-1",
    hearingType: "FIRST_APPEARANCE",
    scheduledAt: new Date(),
    outcomeType: "PENDING",
    nextHearingAt: null,
    ...overrides,
  } as unknown as CaseHearingRow;
}

function makeDecision(overrides: Partial<CaseProsecutionDecisionRow> = {}): CaseProsecutionDecisionRow {
  return { id: "decision-1", ...overrides } as unknown as CaseProsecutionDecisionRow;
}

function baseCtx(overrides: Partial<CaseNextActionsContext> = {}): CaseNextActionsContext {
  return {
    arrests: [],
    hearings: [],
    prosecutionDecisions: [],
    evidenceCount: 1,
    criminalsCount: 1,
    ...overrides,
  };
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

describe("getCaseNextActions", () => {
  it("returns no actions for an archived case regardless of context", () => {
    const caseRow = makeCase({ status: "ARCHIVED", assignedToUserId: null });
    const actions = getCaseNextActions(caseRow, baseCtx({ evidenceCount: 0, criminalsCount: 0 }));
    expect(actions).toEqual([]);
  });

  it("flags a missing investigating officer", () => {
    const caseRow = makeCase({ assignedToUserId: null });
    const actions = getCaseNextActions(caseRow, baseCtx());
    expect(actions).toContainEqual(expect.objectContaining({ label: "Assign an investigating officer", severity: "attention" }));
  });

  it("does not flag the officer action once one is assigned", () => {
    const caseRow = makeCase({ assignedToUserId: "u1" });
    const actions = getCaseNextActions(caseRow, baseCtx());
    expect(actions.some((a) => a.label === "Assign an investigating officer")).toBe(false);
  });

  it("flags missing evidence", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(caseRow, baseCtx({ evidenceCount: 0 }));
    expect(actions).toContainEqual(expect.objectContaining({
      label: "Log evidence before submitting the docket for review",
      severity: "info",
    }));
  });

  it("does not flag evidence once at least one item is logged", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(caseRow, baseCtx({ evidenceCount: 3 }));
    expect(actions.some((a) => a.label.startsWith("Log evidence"))).toBe(false);
  });

  it("flags missing linked persons of interest", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(caseRow, baseCtx({ criminalsCount: 0 }));
    expect(actions).toContainEqual(expect.objectContaining({
      label: "Link a suspect, witness, or victim once identified",
      severity: "info",
    }));
  });

  it("suggests arrest/surveillance when a suspect is linked but no arrest yet", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(caseRow, baseCtx({ criminalsCount: 1, arrests: [] }));
    expect(actions).toContainEqual(expect.objectContaining({
      label: "Consider arrest or continued surveillance of the identified suspect",
      severity: "info",
    }));
  });

  it("does not suggest arrest/surveillance once an arrest has been made", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(caseRow, baseCtx({ criminalsCount: 1, arrests: [makeArrest()] }));
    expect(actions.some((a) => a.label.includes("Consider arrest"))).toBe(false);
  });

  it("marks first appearance scheduling as attention when within the 48-hour window", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({ arrests: [makeArrest({ arrestedAt: hoursAgo(2) })], hearings: [] }),
    );
    const action = actions.find((a) => a.label.startsWith("Schedule first appearance"));
    expect(action?.severity).toBe("attention");
  });

  it("marks first appearance scheduling as overdue after the 48-hour window", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({ arrests: [makeArrest({ arrestedAt: hoursAgo(72) })], hearings: [] }),
    );
    const action = actions.find((a) => a.label.startsWith("Schedule first appearance"));
    expect(action?.severity).toBe("overdue");
  });

  it("uses the most recent arrest when computing the first-appearance due date", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        arrests: [makeArrest({ id: "a1", arrestedAt: hoursAgo(72) }), makeArrest({ id: "a2", arrestedAt: hoursAgo(2) })],
        hearings: [],
      }),
    );
    const action = actions.find((a) => a.label.startsWith("Schedule first appearance"));
    expect(action?.severity).toBe("attention");
  });

  it("does not ask to schedule a first appearance once one already exists", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        arrests: [makeArrest({ arrestedAt: hoursAgo(72) })],
        hearings: [makeHearing({ hearingType: "FIRST_APPEARANCE", outcomeType: "HELD", scheduledAt: hoursAgo(1) })],
      }),
    );
    expect(actions.some((a) => a.label.startsWith("Schedule first appearance"))).toBe(false);
  });

  it("flags an awaited NPA charge decision once a first appearance has occurred", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        hearings: [makeHearing({ hearingType: "FIRST_APPEARANCE", outcomeType: "HELD", scheduledAt: hoursAgo(1) })],
        prosecutionDecisions: [],
      }),
    );
    expect(actions).toContainEqual(expect.objectContaining({ label: "Awaiting NPA charge decision on the docket", severity: "attention" }));
  });

  it("does not flag a charge decision once one has been recorded", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        hearings: [makeHearing({ hearingType: "FIRST_APPEARANCE", outcomeType: "HELD", scheduledAt: hoursAgo(1) })],
        prosecutionDecisions: [makeDecision()],
      }),
    );
    expect(actions.some((a) => a.label.includes("charge decision"))).toBe(false);
  });

  it("prompts referral to the prosecutor when awaiting review with no decision", () => {
    const caseRow = makeCase({ status: "AWAITING_REVIEW" });
    const actions = getCaseNextActions(caseRow, baseCtx({ prosecutionDecisions: [] }));
    expect(actions).toContainEqual(expect.objectContaining({
      label: "Refer docket to the prosecutor for a charge decision",
      severity: "attention",
    }));
  });

  it("does not prompt referral when not in AWAITING_REVIEW status", () => {
    const caseRow = makeCase({ status: "UNDER_INVESTIGATION" });
    const actions = getCaseNextActions(caseRow, baseCtx({ prosecutionDecisions: [] }));
    expect(actions.some((a) => a.label.includes("Refer docket"))).toBe(false);
  });

  it("flags a pending hearing whose scheduled date has passed as overdue", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        hearings: [makeHearing({ hearingType: "BAIL", outcomeType: "PENDING", scheduledAt: hoursAgo(5) })],
      }),
    );
    const action = actions.find((a) => a.label.startsWith("Record the outcome"));
    expect(action?.severity).toBe("overdue");
  });

  it("does not flag a pending hearing scheduled in the future", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        hearings: [makeHearing({ hearingType: "BAIL", outcomeType: "PENDING", scheduledAt: hoursFromNow(5) })],
      }),
    );
    expect(actions.some((a) => a.label.startsWith("Record the outcome"))).toBe(false);
  });

  it("flags a lapsed next-hearing date with no follow-up scheduled", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        hearings: [
          makeHearing({
            id: "h1",
            hearingType: "PLEA",
            outcomeType: "HELD",
            scheduledAt: hoursAgo(200),
            nextHearingAt: hoursAgo(10),
          }),
        ],
      }),
    );
    expect(actions).toContainEqual(expect.objectContaining({
      label: "Schedule the next hearing date carried over from the last postponement",
      severity: "overdue",
      dueAt: hoursAgo(10),
    }));
  });

  it("does not flag a lapsed next-hearing date once a follow-up hearing exists", () => {
    const caseRow = makeCase();
    const nextHearingAt = hoursAgo(10);
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        hearings: [
          makeHearing({ id: "h1", hearingType: "PLEA", outcomeType: "HELD", scheduledAt: hoursAgo(200), nextHearingAt }),
          makeHearing({ id: "h2", hearingType: "TRIAL", outcomeType: "PENDING", scheduledAt: hoursFromNow(1) }),
        ],
      }),
    );
    expect(actions.some((a) => a.label.includes("carried over"))).toBe(false);
  });

  it("tags every action with a stable code", () => {
    const caseRow = makeCase({ assignedToUserId: null });
    const actions = getCaseNextActions(caseRow, baseCtx({ evidenceCount: 0, criminalsCount: 0 }));
    expect(actions.map((a) => a.code)).toEqual(["ASSIGN_INVESTIGATOR", "LOG_EVIDENCE", "LINK_PERSON"]);
  });

  it("points hearing-outcome actions at the hearing", () => {
    const caseRow = makeCase();
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({ hearings: [makeHearing({ id: "h9", outcomeType: "PENDING", scheduledAt: hoursAgo(5) })] }),
    );
    expect(actions).toContainEqual(
      expect.objectContaining({ code: "RECORD_HEARING_OUTCOME", targetId: "h9" }),
    );
  });

  it("drops investigation nudges once the case is closed", () => {
    const caseRow = makeCase({ status: "CLOSED", assignedToUserId: null });
    const actions = getCaseNextActions(caseRow, baseCtx({ evidenceCount: 0, criminalsCount: 0 }));
    expect(actions).toEqual([]);
  });

  it("shows only the referral (not also 'awaiting decision') while awaiting review", () => {
    const caseRow = makeCase({ status: "AWAITING_REVIEW" });
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        hearings: [makeHearing({ hearingType: "FIRST_APPEARANCE", outcomeType: "HELD", scheduledAt: hoursAgo(1) })],
      }),
    );
    const codes = actions.map((a) => a.code);
    expect(codes).toContain("REFER_TO_PROSECUTOR");
    expect(codes).not.toContain("AWAIT_PROSECUTION_DECISION");
  });

  it("returns an empty list when every checklist item is already satisfied", () => {
    const caseRow = makeCase({ status: "UNDER_INVESTIGATION", assignedToUserId: "u1" });
    const actions = getCaseNextActions(
      caseRow,
      baseCtx({
        evidenceCount: 2,
        criminalsCount: 1,
        arrests: [makeArrest({ arrestedAt: hoursAgo(72) })],
        hearings: [makeHearing({ hearingType: "FIRST_APPEARANCE", outcomeType: "HELD", scheduledAt: hoursAgo(70) })],
        prosecutionDecisions: [makeDecision()],
      }),
    );
    expect(actions).toEqual([]);
  });
});
