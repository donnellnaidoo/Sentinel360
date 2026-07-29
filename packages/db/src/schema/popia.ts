import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";

// POPIA s24: data subject requests to have their personal information
// deleted. Requests are reviewed, not auto-executed — cases, evidence, and
// audit_log rows a user is linked to are retained under POPIA s11(1)(d)/(f)
// (legal obligation / legitimate interest: CPA evidentiary retention), so
// approving a request anonymizes the profile fields that have no such
// retention basis while investigative records referencing the user stay
// intact. See routers/popia.ts#reviewDeletionRequest.
export const dataDeletionRequest = pgTable("data_deletion_request", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(), // PENDING, APPROVED (transient), REJECTED, COMPLETED
  reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dataDeletionRequestRelations = relations(dataDeletionRequest, ({ one }) => ({
  user: one(user, {
    fields: [dataDeletionRequest.userId],
    references: [user.id],
  }),
  reviewedBy: one(user, {
    fields: [dataDeletionRequest.reviewedByUserId],
    references: [user.id],
  }),
}));
