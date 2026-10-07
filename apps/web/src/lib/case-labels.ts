import type { z } from "zod";

import type {
  bailDecisionSchema,
  bailScheduleClassificationSchema,
  caseCriminalRoleSchema,
  casePrioritySchema,
  custodyStatusSchema,
  hearingOutcomeTypeSchema,
  hearingTypeSchema,
  prosecutionDecisionSchema,
} from "@Sentinel360/api/validators/index";

import { humanizeEnum } from "./format";

// Typed against the API's Zod enums, so adding a value there without a
// label here is a compile error rather than raw UPPER_SNAKE in the UI.

type Option<T extends string> = { value: T; label: string; hint?: string };

function options<T extends string>(map: Record<T, string>, hints?: Partial<Record<T, string>>): Option<T>[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value], hint: hints?.[value] }));
}

export type CasePriority = z.infer<typeof casePrioritySchema>;
export const PRIORITY_LABELS: Record<CasePriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
export const PRIORITY_STYLES: Record<CasePriority, string> = {
  LOW: "bg-surface-container-low text-on-surface-variant",
  MEDIUM: "bg-secondary/10 text-secondary",
  HIGH: "bg-tertiary/10 text-tertiary",
  CRITICAL: "bg-error-container text-on-error-container",
};

export type PersonRole = z.infer<typeof caseCriminalRoleSchema>;
export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  SUSPECT: "Suspect",
  PERSON_OF_INTEREST: "Person of interest",
  WITNESS: "Witness",
  VICTIM: "Victim",
  ARRESTED: "Arrested",
};
// "Arrested" is a fact recorded on the Prosecution & court tab, not a role
// you pick when linking someone — so it isn't offered here.
export const LINKABLE_PERSON_ROLES = options(
  {
    SUSPECT: PERSON_ROLE_LABELS.SUSPECT,
    PERSON_OF_INTEREST: PERSON_ROLE_LABELS.PERSON_OF_INTEREST,
    WITNESS: PERSON_ROLE_LABELS.WITNESS,
    VICTIM: PERSON_ROLE_LABELS.VICTIM,
  } as Record<Exclude<PersonRole, "ARRESTED">, string>,
  {
    SUSPECT: "Believed to have committed the offence",
    PERSON_OF_INTEREST: "Not yet a suspect, but relevant to the investigation",
    WITNESS: "Saw or knows something about the incident",
    VICTIM: "The person harmed by the offence",
  },
);
/** Roles that can be arrested on this case. */
export const ARRESTABLE_ROLES: PersonRole[] = ["SUSPECT", "PERSON_OF_INTEREST", "ARRESTED"];

export type CustodyStatus = z.infer<typeof custodyStatusSchema>;
export const CUSTODY_LABELS: Record<CustodyStatus, string> = {
  IN_CUSTODY: "In custody",
  RELEASED_ON_BAIL: "Released on bail",
  RELEASED_NO_CHARGE: "Released without charge",
  ESCAPED: "Escaped",
};
export const CUSTODY_OPTIONS = options(CUSTODY_LABELS);

export type ProsecutionDecision = z.infer<typeof prosecutionDecisionSchema>;
export const DECISION_LABELS: Record<ProsecutionDecision, string> = {
  PROCEED_TO_TRIAL: "Proceed to trial",
  DECLINE_TO_PROSECUTE: "Declined to prosecute (nolle prosequi)",
  DIVERSION: "Diversion",
  FURTHER_INVESTIGATION: "Further investigation requested",
  PLEA_BARGAIN: "Plea and sentence agreement (s105A)",
};
export const DECISION_OPTIONS = options(DECISION_LABELS, {
  PROCEED_TO_TRIAL: "The prosecutor will enrol the matter for trial",
  DECLINE_TO_PROSECUTE: "The prosecutor will not charge on the current docket",
  DIVERSION: "The accused is diverted to a programme instead of prosecution",
  FURTHER_INVESTIGATION: "The docket goes back to the investigator for more work",
  PLEA_BARGAIN: "A plea and sentence agreement is negotiated with the defence",
});

export type HearingType = z.infer<typeof hearingTypeSchema>;
export const HEARING_TYPE_LABELS: Record<HearingType, string> = {
  FIRST_APPEARANCE: "First appearance",
  BAIL_HEARING: "Bail hearing",
  PRE_TRIAL: "Pre-trial",
  PLEA: "Plea",
  TRIAL: "Trial",
  SENTENCING: "Sentencing",
  APPEAL: "Appeal",
  POSTPONEMENT: "Postponement",
};
export const HEARING_TYPE_OPTIONS = options(HEARING_TYPE_LABELS);

export type HearingOutcome = z.infer<typeof hearingOutcomeTypeSchema>;
export const OUTCOME_LABELS: Record<HearingOutcome, string> = {
  PENDING: "Pending",
  POSTPONED: "Postponed",
  PROCEEDED: "Proceeded",
  GUILTY: "Guilty",
  NOT_GUILTY: "Not guilty",
  SENTENCED: "Sentenced",
  WITHDRAWN: "Withdrawn",
  STRUCK_OFF_ROLL: "Struck off the roll",
};
export const OUTCOME_OPTIONS = options(OUTCOME_LABELS, {
  POSTPONED: "Remanded to a later date — you'll need the next court date",
  PROCEEDED: "The hearing went ahead as planned",
  STRUCK_OFF_ROLL: "Removed from the court roll (e.g. not ready to proceed)",
  WITHDRAWN: "Charges withdrawn by the prosecution",
});
/** Outcomes that describe what happened, so only valid once the hearing date has passed. */
export const RESULT_OUTCOMES: HearingOutcome[] = ["PROCEEDED", "GUILTY", "NOT_GUILTY", "SENTENCED", "STRUCK_OFF_ROLL"];

export type BailSchedule = z.infer<typeof bailScheduleClassificationSchema>;
export const BAIL_SCHEDULE_LABELS: Record<BailSchedule, string> = {
  NONE: "Not a scheduled offence",
  SCHEDULE_1: "Schedule 1",
  SCHEDULE_5: "Schedule 5",
  SCHEDULE_6: "Schedule 6",
};
export const BAIL_SCHEDULE_OPTIONS = options(BAIL_SCHEDULE_LABELS, {
  SCHEDULE_1: "Ordinary bail application",
  SCHEDULE_5: "Serious offence — accused must show the interests of justice permit release",
  SCHEDULE_6: "Most serious — accused must show exceptional circumstances",
});

export type BailDecision = z.infer<typeof bailDecisionSchema>;
export const BAIL_DECISION_LABELS: Record<BailDecision, string> = {
  GRANTED: "Bail granted",
  DENIED: "Bail denied",
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  PERSON: "Person",
  VEHICLE: "Vehicle",
  OBJECT: "Object",
};

// Note types are free text in the API (2–50 chars); these are the ones the
// console offers. STATUS_CHANGE is written by the system on status moves.
export const NOTE_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  INTERVIEW: "Interview",
  SURVEILLANCE: "Surveillance",
  FOLLOW_UP: "Follow-up",
  STATUS_CHANGE: "Status change",
};
export const NOTE_TYPE_OPTIONS = ["GENERAL", "INTERVIEW", "SURVEILLANCE", "FOLLOW_UP"].map((value) => ({
  value,
  label: NOTE_TYPE_LABELS[value]!,
}));

export const TIMELINE_EVENTS: Record<string, { label: string; icon: string }> = {
  CASE_CREATED: { label: "Case opened", icon: "create_new_folder" },
  STATUS_CHANGE: { label: "Status changed", icon: "sync_alt" },
  NOTE_ADDED: { label: "Note added", icon: "notes" },
  INCIDENT_LINKED: { label: "Incident linked", icon: "link" },
  EVIDENCE_LINKED: { label: "Evidence added", icon: "upload_file" },
  CRIMINAL_LINKED: { label: "Person linked", icon: "person_add" },
  CRIMINAL_UNLINKED: { label: "Person unlinked", icon: "person_remove" },
  ARREST_RECORDED: { label: "Arrest recorded", icon: "local_police" },
  PROSECUTION_DECISION: { label: "NPA decision", icon: "gavel" },
  HEARING_SCHEDULED: { label: "Hearing scheduled", icon: "event" },
  HEARING_OUTCOME_RECORDED: { label: "Hearing outcome", icon: "event_available" },
  INVESTIGATOR_ASSIGNED: { label: "Investigator assigned", icon: "assignment_ind" },
  INVESTIGATOR_UNASSIGNED: { label: "Investigator unassigned", icon: "person_off" },
  SENSITIVITY_CHANGED: { label: "Access restriction changed", icon: "lock" },
};

export function label(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return map[value] ?? humanizeEnum(value);
}
