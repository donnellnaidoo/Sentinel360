import { pgTable, text, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";

export const camera = pgTable(
  "camera",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    location: jsonb("location").default({}).notNull(),
    deviceType: text("device_type"),
    streamUrl: text("stream_url"),
    capabilities: jsonb("capabilities").default({}).notNull(),
    status: text("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const monitoringZone = pgTable(
  "monitoring_zone",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    boundaryGeojson: jsonb("boundary_geojson").default({}).notNull(),
    threatLevel: text("threat_level"),
    assignedCameraIds: jsonb("assigned_camera_ids").default([]).notNull(),
    defaultDetectionConfig: jsonb("default_detection_config").default({}).notNull(),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);
