import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  numeric,
  primaryKey,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";
import { entityProfile } from "./entities";

export const lawEnforcementOfficer = pgTable("law_enforcement_officer", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  badgeNumber: text("badge_number").notNull().unique(),
  department: text("department"),
  jurisdiction: text("jurisdiction"),
  verificationStatus: text("verification_status").default("PENDING").notNull(),
  clearanceLevel: text("clearance_level").default("STANDARD").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const incident = pgTable(
  "incident",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentNumber: text("incident_number").notNull().unique(),
    incidentType: text("incident_type").notNull(),
    title: text("title"),
    description: text("description").notNull(),
    location: jsonb("location").default({}).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    severity: text("severity").default("MEDIUM").notNull(),
    status: text("status").default("REPORTED").notNull(),
    sourceDomain: text("source_domain"),
    sourceEntityType: text("source_entity_type"),
    sourceEntityId: text("source_entity_id"),
    reportedByUserId: text("reported_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("incident_status_idx").on(table.status),
    index("incident_severity_idx").on(table.severity),
  ],
);

export const investigationCase = pgTable("case", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseNumber: text("case_number").notNull().unique(),
  caseType: text("case_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("MEDIUM").notNull(),
  status: text("status").default("OPEN").notNull(),
  assignedToUserId: text("assigned_to_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdByUserId: text("created_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const caseIncident = pgTable(
  "case_incident",
  {
    caseId: uuid("case_id")
      .notNull()
      .references(() => investigationCase.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incident.id, { onDelete: "cascade" }),
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.caseId, table.incidentId] })],
);

export const investigationNote = pgTable("investigation_note", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => investigationCase.id, { onDelete: "cascade" }),
  noteType: text("note_type").notNull(),
  content: text("content").notNull(),
  createdByUserId: text("created_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const caseEvidence = pgTable("case_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => investigationCase.id, { onDelete: "cascade" }),
  evidenceEntityType: text("evidence_entity_type").notNull(),
  evidenceEntityId: text("evidence_entity_id").notNull(),
  relationshipDescription: text("relationship_description"),
  createdByUserId: text("created_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evidenceRequest = pgTable(
  "evidence_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestingOfficerId: uuid("requesting_officer_id")
      .notNull()
      .references(() => lawEnforcementOfficer.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => investigationCase.id, { onDelete: "cascade" }),
    requestType: text("request_type").notNull(),
    description: text("description").notNull(),
    parameters: jsonb("parameters").default({}).notNull(),
    status: text("status").default("REQUESTED").notNull(),
    assignedToUserId: text("assigned_to_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    fulfillmentNotes: text("fulfillment_notes"),
    evidenceIds: jsonb("evidence_ids").default([]).notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "evidence_request_fulfilled_time_ck",
      sql`${table.fulfilledAt} IS NULL OR ${table.fulfilledAt} >= ${table.requestedAt}`,
    ),
  ],
);

export const caseShareRecord = pgTable("case_share_record", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => investigationCase.id, { onDelete: "cascade" }),
  sharedByUserId: text("shared_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  targetAgency: text("target_agency").notNull(),
  integrationId: uuid("integration_id"),
  scope: jsonb("scope").default({}).notNull(),
  dataHash: text("data_hash").notNull(),
  sharingAgreementRef: text("sharing_agreement_ref"),
  sharedAt: timestamp("shared_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const caseReport = pgTable("case_report", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => investigationCase.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull(),
  title: text("title").notNull(),
  sections: jsonb("sections").default([]).notNull(),
  fileUrl: text("file_url").notNull(),
  fileHash: text("file_hash").notNull(),
  format: text("format").notNull(),
  isSigned: boolean("is_signed").default(false).notNull(),
  generatedByUserId: text("generated_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// --- Judicial lifecycle: suspect linking, arrest, prosecution, court hearings ---
// Modeled on the South African Criminal Procedure Act 51/1977 sequence that
// follows an investigation: arrest -> first appearance (within 48h, s50) ->
// bail -> NPA charge decision -> pre-trial hearings -> plea/trial -> verdict
// -> sentencing. These sit alongside (not inside) the existing OPEN ->
// UNDER_INVESTIGATION -> AWAITING_REVIEW -> CLOSED -> ARCHIVED status
// machine in case-status.ts, which tracks docket administration, not the
// judicial process itself.

export const caseCriminal = pgTable(
  "case_criminal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => investigationCase.id, { onDelete: "cascade" }),
    entityProfileId: uuid("entity_profile_id")
      .notNull()
      .references(() => entityProfile.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    notes: text("notes"),
    linkedByUserId: text("linked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("case_criminal_case_idx").on(table.caseId)],
);

export const caseArrest = pgTable(
  "case_arrest",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => investigationCase.id, { onDelete: "cascade" }),
    entityProfileId: uuid("entity_profile_id")
      .notNull()
      .references(() => entityProfile.id, { onDelete: "cascade" }),
    arrestedAt: timestamp("arrested_at", { withTimezone: true }).notNull(),
    arrestedByOfficerId: uuid("arrested_by_officer_id").references(
      () => lawEnforcementOfficer.id,
      { onDelete: "set null" },
    ),
    withWarrant: boolean("with_warrant").default(false).notNull(),
    warrantNumber: text("warrant_number"),
    location: jsonb("location").default({}).notNull(),
    // Constitution s35(1)(a): everyone arrested has the right to be informed
    // promptly of the reason for the arrest.
    rightsInformedAt: timestamp("rights_informed_at", { withTimezone: true }),
    custodyStatus: text("custody_status").default("IN_CUSTODY").notNull(),
    notes: text("notes"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("case_arrest_case_idx").on(table.caseId)],
);

export const caseProsecutionDecision = pgTable(
  "case_prosecution_decision",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => investigationCase.id, { onDelete: "cascade" }),
    decision: text("decision").notNull(),
    prosecutorName: text("prosecutor_name"),
    decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),
    reason: text("reason"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("case_prosecution_decision_case_idx").on(table.caseId)],
);

// One row per scheduled court appearance. hearingType spans the whole
// pre-trial/trial sequence (first appearance, bail, pre-trial postponements,
// plea, trial, sentencing, appeal) since they share the same shape: a date,
// a court, an outcome, and usually a next date. The bail* columns are only
// populated when hearingType = BAIL_HEARING.
export const caseHearing = pgTable(
  "case_hearing",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => investigationCase.id, { onDelete: "cascade" }),
    hearingType: text("hearing_type").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    courtName: text("court_name"),
    caseRollNumber: text("case_roll_number"),
    presidingOfficer: text("presiding_officer"),
    outcomeType: text("outcome_type").default("PENDING").notNull(),
    outcomeNotes: text("outcome_notes"),
    nextHearingAt: timestamp("next_hearing_at", { withTimezone: true }),
    // CPA Schedule 1/5/6 classification determines how difficult bail is to
    // obtain; only meaningful when hearingType = BAIL_HEARING.
    bailScheduleClassification: text("bail_schedule_classification"),
    bailAmount: numeric("bail_amount", { precision: 12, scale: 2 }),
    bailConditions: text("bail_conditions"),
    bailDecision: text("bail_decision"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("case_hearing_case_idx").on(table.caseId),
    index("case_hearing_scheduled_idx").on(table.scheduledAt),
  ],
);

// Immutable append-only feed of every lifecycle action taken on a case
// (status changes, notes, evidence/incident links, suspect links, arrests,
// prosecution decisions, hearing scheduling/outcomes). Written exclusively
// via services/case-timeline.ts#recordCaseEvent — see that file's comment
// for why this also mirrors into the audit_log.
export const caseTimelineEntry = pgTable(
  "case_timeline_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => investigationCase.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload").default({}).notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("case_timeline_entry_case_idx").on(table.caseId),
    index("case_timeline_entry_occurred_idx").on(table.occurredAt),
  ],
);

export const investigationCaseRelations = relations(investigationCase, ({ one, many }) => ({
  assignedTo: one(user, {
    fields: [investigationCase.assignedToUserId],
    references: [user.id],
  }),
  createdBy: one(user, {
    fields: [investigationCase.createdByUserId],
    references: [user.id],
  }),
  notes: many(investigationNote),
  evidenceLinks: many(caseEvidence),
  incidentLinks: many(caseIncident),
  criminals: many(caseCriminal),
  arrests: many(caseArrest),
  prosecutionDecisions: many(caseProsecutionDecision),
  hearings: many(caseHearing),
  timelineEntries: many(caseTimelineEntry),
}));

export const caseCriminalRelations = relations(caseCriminal, ({ one }) => ({
  case: one(investigationCase, {
    fields: [caseCriminal.caseId],
    references: [investigationCase.id],
  }),
  entity: one(entityProfile, {
    fields: [caseCriminal.entityProfileId],
    references: [entityProfile.id],
  }),
}));

export const caseArrestRelations = relations(caseArrest, ({ one }) => ({
  case: one(investigationCase, {
    fields: [caseArrest.caseId],
    references: [investigationCase.id],
  }),
  entity: one(entityProfile, {
    fields: [caseArrest.entityProfileId],
    references: [entityProfile.id],
  }),
  arrestedByOfficer: one(lawEnforcementOfficer, {
    fields: [caseArrest.arrestedByOfficerId],
    references: [lawEnforcementOfficer.id],
  }),
}));

export const caseProsecutionDecisionRelations = relations(caseProsecutionDecision, ({ one }) => ({
  case: one(investigationCase, {
    fields: [caseProsecutionDecision.caseId],
    references: [investigationCase.id],
  }),
}));

export const caseHearingRelations = relations(caseHearing, ({ one }) => ({
  case: one(investigationCase, {
    fields: [caseHearing.caseId],
    references: [investigationCase.id],
  }),
}));

export const caseTimelineEntryRelations = relations(caseTimelineEntry, ({ one }) => ({
  case: one(investigationCase, {
    fields: [caseTimelineEntry.caseId],
    references: [investigationCase.id],
  }),
}));

export const investigationNoteRelations = relations(investigationNote, ({ one }) => ({
  case: one(investigationCase, {
    fields: [investigationNote.caseId],
    references: [investigationCase.id],
  }),
  createdBy: one(user, {
    fields: [investigationNote.createdByUserId],
    references: [user.id],
  }),
}));

export const caseEvidenceRelations = relations(caseEvidence, ({ one }) => ({
  case: one(investigationCase, {
    fields: [caseEvidence.caseId],
    references: [investigationCase.id],
  }),
}));

export const caseIncidentRelations = relations(caseIncident, ({ one }) => ({
  case: one(investigationCase, {
    fields: [caseIncident.caseId],
    references: [investigationCase.id],
  }),
  incident: one(incident, {
    fields: [caseIncident.incidentId],
    references: [incident.id],
  }),
}));

export const lawEnforcementOfficerRelations = relations(lawEnforcementOfficer, ({ one }) => ({
  user: one(user, {
    fields: [lawEnforcementOfficer.userId],
    references: [user.id],
  }),
}));
