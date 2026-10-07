import type { NextActionCode } from "@Sentinel360/api/services/case-next-actions";

import { toDateTimeLocalValue } from "@/lib/format";

import type { DocketLink } from "./nav";

type ActionLike = { code: NextActionCode; dueAt?: Date | string; targetId?: string };

/** Where each next step is done, and what the button on it says. */
export function nextActionTarget(action: ActionLike): { cta: string; link: DocketLink } {
  switch (action.code) {
    case "ASSIGN_INVESTIGATOR":
      return { cta: "Assign", link: { focus: "assign-investigator" } };
    case "LOG_EVIDENCE":
      return { cta: "Upload evidence", link: { tab: "evidence", focus: "evidence-form" } };
    case "LINK_PERSON":
      return { cta: "Link person", link: { tab: "people", focus: "person-form" } };
    case "CONSIDER_ARREST":
      return { cta: "Record arrest", link: { tab: "prosecution", focus: "arrest-form" } };
    case "SCHEDULE_FIRST_APPEARANCE":
      return {
        cta: "Schedule",
        link: { tab: "prosecution", focus: "hearing-form", params: { hearingType: "FIRST_APPEARANCE" } },
      };
    case "AWAIT_PROSECUTION_DECISION":
    case "REFER_TO_PROSECUTOR":
      return { cta: "Record decision", link: { tab: "prosecution", focus: "decision-form" } };
    case "RECORD_HEARING_OUTCOME":
      return {
        cta: "Record outcome",
        link: { tab: "prosecution", focus: "hearing-outcome", params: { hearingId: action.targetId } },
      };
    case "SCHEDULE_NEXT_HEARING":
      return {
        cta: "Schedule",
        link: {
          tab: "prosecution",
          focus: "hearing-form",
          params: { scheduledAt: action.dueAt ? toDateTimeLocalValue(action.dueAt) : undefined },
        },
      };
  }
}
