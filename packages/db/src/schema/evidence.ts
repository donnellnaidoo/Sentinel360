import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  bigint,
  integer,
  numeric,
  boolean,
  index,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// Evidence files (uploads, CCTV clips, documents) live here. Evidence is
// linked to cases polymorphically via case_evidence.evidence_entity_id
// (evidence_entity_type = 'MEDIA_ASSET') rather than a direct FK, so the
// same table can later serve AI-pipeline-sourced media too.
export const mediaAsset = pgTable(
  "media_asset",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    source: text("source").notNull(),
    sourceCameraId: text("source_camera_id"),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    fileHash: text("file_hash").notNull().unique(),
    storageUrl: text("storage_url").notNull(),
    storageTier: text("storage_tier").default("HOT").notNull(),
    duration: integer("duration"),
    resolution: text("resolution"),
    codec: text("codec"),
    framerate: numeric("framerate", { precision: 10, scale: 3 }),
    gpsLatitude: numeric("gps_latitude", { precision: 10, scale: 7 }),
    gpsLongitude: numeric("gps_longitude", { precision: 10, scale: 7 }),
    status: text("status").default("PROCESSING").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("media_asset_type_idx").on(table.type),
    index("media_asset_source_idx").on(table.source),
    index("media_asset_created_at_idx").on(table.createdAt),
  ],
);

// Immutable, append-only ledger. Rows are never updated or deleted — every
// access/transfer/verification of a piece of evidence writes a new row here
// so the chain can be replayed for court (CPA 51/1977, ECTA s15).
export const chainOfCustody = pgTable("chain_of_custody", {
  id: uuid("id").defaultRandom().primaryKey(),
  evidenceEntityType: text("evidence_entity_type").notNull(),
  evidenceEntityId: text("evidence_entity_id").notNull(),
  action: text("action").notNull(),
  fromUserId: text("from_user_id").references(() => user.id, { onDelete: "set null" }),
  toUserId: text("to_user_id").references(() => user.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  location: text("location"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evidenceIntegrityCheck = pgTable("evidence_integrity_check", {
  id: uuid("id").defaultRandom().primaryKey(),
  evidenceEntityType: text("evidence_entity_type").notNull(),
  evidenceEntityId: text("evidence_entity_id").notNull(),
  computedHash: text("computed_hash").notNull(),
  storedHash: text("stored_hash").notNull(),
  isValid: boolean("is_valid").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const complianceReport = pgTable("compliance_report", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  reportType: text("report_type").notNull(),
  dateRangeStart: timestamp("date_range_start", { withTimezone: true }),
  dateRangeEnd: timestamp("date_range_end", { withTimezone: true }),
  content: jsonb("content").default({}).notNull(),
  generatedByUserId: text("generated_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mediaAssetRelations = relations(mediaAsset, ({ one }) => ({
  createdBy: one(user, {
    fields: [mediaAsset.createdByUserId],
    references: [user.id],
  }),
}));
