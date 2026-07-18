import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organization, userRole } from "./rbac";

// Profile table — mirrors auth.users from Supabase; id must match auth.users.id (UUID)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  isActive: boolean("is_active").default(true).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: varchar("last_login_ip", { length: 45 }),
  organizationId: uuid("organization_id").references(() => organization.id),
  requires2fa: boolean("requires_2fa").default(false).notNull(),
  totpSecret: varchar("totp_secret", { length: 64 }),
  // POPIA s11: proof that the data subject consented to processing at
  // registration. Null means no consent on record (pre-POPIA-rollout
  // accounts, or a gap that must be remediated, not "implicitly fine").
  popiaConsentAt: timestamp("popia_consent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const userRelations = relations(user, ({ many, one }) => ({
  userRoles: many(userRole),
  organization: one(organization, {
    fields: [user.organizationId],
    references: [organization.id],
  }),
}));
