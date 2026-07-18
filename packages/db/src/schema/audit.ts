import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  index,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    domain: varchar("domain", { length: 100 }).notNull(),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorType: varchar("actor_type", { length: 50 }).default("USER").notNull(),
    targetEntityType: varchar("target_entity_type", { length: 100 }),
    targetEntityId: text("target_entity_id"),
    action: varchar("action", { length: 50 }).notNull(),
    payload: jsonb("payload").default({}).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    // Hash chain: entryHash = sha256(previousHash + canonical(payload)).
    // Makes the log tamper-evident (append-only) — required for CPA/POPIA
    // evidentiary audit trails, not just a debugging log.
    entryHash: text("entry_hash").notNull().unique(),
    previousHash: text("previous_hash"),
    status: varchar("status", { length: 20 }).default("COMPLETE").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_domain_idx").on(table.domain),
    index("audit_log_event_type_idx").on(table.eventType),
    index("audit_log_created_at_idx").on(table.createdAt),
    index("audit_log_actor_idx").on(table.actorId),
  ],
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(user, {
    fields: [auditLog.actorId],
    references: [user.id],
  }),
}));
