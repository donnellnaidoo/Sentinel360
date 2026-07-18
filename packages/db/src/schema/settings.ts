import { pgTable, text, timestamp, uuid, jsonb, boolean, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./auth";

// System configuration tables. Like sightings/alerts, these already exist
// in the live database — this file describes them as introspected, not a
// new schema to create.
export const systemSetting = pgTable("system_setting", {
  id: uuid("id").defaultRandom().primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: jsonb("setting_value").default({}).notNull(),
  settingType: text("setting_type").default("json").notNull(),
  lastModifiedByUserId: text("last_modified_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const featureFlag = pgTable("feature_flag", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  dependencies: jsonb("dependencies").default([]).notNull(),
  rolloutPercentage: numeric("rollout_percentage", { precision: 10, scale: 4 }),
  updatedByUserId: text("updated_by_user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const systemSettingRelations = relations(systemSetting, ({ one }) => ({
  lastModifiedBy: one(user, {
    fields: [systemSetting.lastModifiedByUserId],
    references: [user.id],
  }),
}));

export const featureFlagRelations = relations(featureFlag, ({ one }) => ({
  updatedBy: one(user, {
    fields: [featureFlag.updatedByUserId],
    references: [user.id],
  }),
}));
