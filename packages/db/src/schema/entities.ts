import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, jsonb, integer, numeric } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { investigationCase } from "./cases";

// Suspect / person-of-interest / vehicle profiles. Fields like
// primaryFaceEmbedding, detectionCount and locationsSeen are populated by
// the AI/CCTV pipeline (deferred); the investigation MVP only reads/writes
// entityType, displayName, attributes, status, watchlistStatus and notes.
export const entityProfile = pgTable("entity_profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type").notNull(),
  displayName: text("display_name"),
  primaryFaceImageUrl: text("primary_face_image_url"),
  primaryFaceEmbedding: jsonb("primary_face_embedding"),
  knownPlateNumbers: jsonb("known_plate_numbers").default([]).notNull(),
  attributes: jsonb("attributes").default({}).notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  detectionCount: integer("detection_count").default(0).notNull(),
  locationsSeen: jsonb("locations_seen").default([]).notNull(),
  status: text("status").default("ACTIVE").notNull(),
  watchlistStatus: text("watchlist_status").default("NONE").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const watchlistEntry = pgTable("watchlist_entry", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityProfileId: uuid("entity_profile_id")
    .notNull()
    .references(() => entityProfile.id, { onDelete: "cascade" }),
  priorityLevel: text("priority_level").notNull(),
  reason: text("reason").notNull(),
  caseId: uuid("case_id").references(() => investigationCase.id, { onDelete: "set null" }),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  createdByUserId: text("created_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  status: text("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Populated by the AI matching pipeline (deferred). Declared now so
// entityProfileRelations resolves and later phases don't need a migration.
export const entityMatch = pgTable("entity_match", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityProfileId: uuid("entity_profile_id").references(() => entityProfile.id, {
    onDelete: "set null",
  }),
  sourceEntityType: text("source_entity_type").notNull(),
  sourceEntityId: text("source_entity_id").notNull(),
  similarityScore: numeric("similarity_score", { precision: 10, scale: 4 }).notNull(),
  matchedAt: timestamp("matched_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const entityProfileRelations = relations(entityProfile, ({ many }) => ({
  watchlistEntries: many(watchlistEntry),
  matches: many(entityMatch),
}));

export const watchlistEntryRelations = relations(watchlistEntry, ({ one }) => ({
  entity: one(entityProfile, {
    fields: [watchlistEntry.entityProfileId],
    references: [entityProfile.id],
  }),
  case: one(investigationCase, {
    fields: [watchlistEntry.caseId],
    references: [investigationCase.id],
  }),
}));
