import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
    reportedByUserId: text("reported_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("incident_status_idx").on(table.status),
    index("incident_severity_idx").on(table.severity),
  ],
);
