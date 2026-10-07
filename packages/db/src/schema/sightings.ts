import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, jsonb, boolean, type AnyPgColumn } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { incident } from "./cases";
import { entityProfile } from "./entities";

// Community-submitted sighting reports. This table already exists in the
// live database (provisioned ahead of this repo's Drizzle schema/migrations)
// — this file describes that existing `community_sighting` table, it does
// not create it. Column names/defaults below were introspected directly
// from the database, not derived from docs/03-DOMAIN-MODEL/06-sightings-domain.md
// (which describes a fuller design that was never fully wired to the app).
export const communitySighting = pgTable("community_sighting", {
  id: uuid("id").defaultRandom().primaryKey(),
  referenceCode: text("reference_code").notNull().unique(),
  reporterUserId: text("reporter_user_id").references(() => user.id, { onDelete: "set null" }),
  sightingType: text("sighting_type").notNull(),
  title: text("title"),
  description: text("description").notNull(),
  location: jsonb("location").default({}).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  mediaIds: jsonb("media_ids").default([]).notNull(),
  status: text("status").default("SUBMITTED").notNull(),
  severity: text("severity"),
  visibility: text("visibility").default("PRIVATE").notNull(),
  operatorNotes: text("operator_notes"),
  linkedIncidentId: uuid("linked_incident_id").references(() => incident.id, {
    onDelete: "set null",
  }),
  // The wanted person the reporter says they saw (picked from the wanted
  // feed). Optional — general reports have no subject. Added in 0011.
  subjectEntityProfileId: uuid("subject_entity_profile_id").references(() => entityProfile.id, {
    onDelete: "set null",
  }),
  // Case ids the subject is tied to (active watchlist entries + case_criminal
  // rows), captured at submission. Suggestions for the moderator only —
  // never returned to community users. Added in 0011.
  suggestedCaseIds: jsonb("suggested_case_ids").$type<string[]>().default([]).notNull(),
  duplicateOfSightingId: uuid("duplicate_of_sighting_id").references(
    (): AnyPgColumn => communitySighting.id,
    { onDelete: "set null" },
  ),
  moderationStatus: text("moderation_status").default("PENDING").notNull(),
  moderationReason: text("moderation_reason"),
  reportedAt: timestamp("reported_at", { withTimezone: true }),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const communitySightingRelations = relations(communitySighting, ({ one }) => ({
  reporter: one(user, {
    fields: [communitySighting.reporterUserId],
    references: [user.id],
  }),
  linkedIncident: one(incident, {
    fields: [communitySighting.linkedIncidentId],
    references: [incident.id],
  }),
  subject: one(entityProfile, {
    fields: [communitySighting.subjectEntityProfileId],
    references: [entityProfile.id],
  }),
}));
