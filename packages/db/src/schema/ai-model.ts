import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const aiModel = pgTable(
  "ai_model",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelKey: text("model_key").notNull().unique(),
    displayName: text("display_name").notNull(),
    modelType: text("model_type").notNull(),
    currentVersion: text("current_version").notNull(),
    status: text("status").default("ACTIVE").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);
