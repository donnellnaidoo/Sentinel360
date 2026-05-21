import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const caseTable = pgTable(
  "case",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseNumber: text("case_number").notNull().unique(),
    caseType: text("case_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority").default("MEDIUM").notNull(),
    status: text("status").default("OPEN").notNull(),
    assignedToUserId: text("assigned_to_user_id"),
    createdByUserId: text("created_by_user_id"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const caseRelations = relations(caseTable, ({ one }) => ({
  assignee: one(user, {
    fields: [caseTable.assignedToUserId],
    references: [user.id],
  }),
  creator: one(user, {
    fields: [caseTable.createdByUserId],
    references: [user.id],
  }),
}));
