import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, jsonb, integer } from "drizzle-orm/pg-core";

import { user } from "./auth";

// Alerts & notifications. Like community_sighting, these tables already
// exist in the live database — this file describes the existing `alert`,
// `alert_acknowledgment`, and `notification` tables as introspected, not a
// new schema to create. `alert` has no target-role or created-by column;
// this app stores those in `metadata` (jsonb) at creation time since
// recipiency is realized as explicit `notification` rows per user, not a
// role filter evaluated at read time.
export const alert = pgTable("alert", {
  id: uuid("id").defaultRandom().primaryKey(),
  alertType: text("alert_type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").default("MEDIUM").notNull(),
  sourceDomain: text("source_domain"),
  sourceEntityType: text("source_entity_type"),
  sourceEntityId: text("source_entity_id"),
  status: text("status").default("ACTIVE").notNull(),
  location: jsonb("location").default({}).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  dedupKey: text("dedup_key"),
  dedupWindowSeconds: integer("dedup_window_seconds"),
  escalationLevel: integer("escalation_level").default(0),
  escalationSlaSeconds: integer("escalation_sla_seconds"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const alertAcknowledgment = pgTable("alert_acknowledgment", {
  id: uuid("id").defaultRandom().primaryKey(),
  alertId: uuid("alert_id")
    .notNull()
    .references(() => alert.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  channel: text("channel"),
  notes: text("notes"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).defaultNow().notNull(),
});

// Per-recipient fan-out row — the actual "is this alert in my inbox" record.
// Created explicitly at alert-creation time for each targeted user (see
// routers/alerts.ts `create`), not derived from a role filter.
export const notification = pgTable("notification", {
  id: uuid("id").defaultRandom().primaryKey(),
  alertId: uuid("alert_id")
    .notNull()
    .references(() => alert.id, { onDelete: "cascade" }),
  recipientUserId: text("recipient_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  deliveryStatus: text("delivery_status").default("PENDING").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const alertRelations = relations(alert, ({ many }) => ({
  acknowledgments: many(alertAcknowledgment),
  notifications: many(notification),
}));

export const alertAcknowledgmentRelations = relations(alertAcknowledgment, ({ one }) => ({
  alert: one(alert, {
    fields: [alertAcknowledgment.alertId],
    references: [alert.id],
  }),
  user: one(user, {
    fields: [alertAcknowledgment.userId],
    references: [user.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  alert: one(alert, {
    fields: [notification.alertId],
    references: [alert.id],
  }),
  recipient: one(user, {
    fields: [notification.recipientUserId],
    references: [user.id],
  }),
}));
