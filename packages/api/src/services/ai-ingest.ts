import { db } from "@Sentinel360/db";
import { alert, notification } from "@Sentinel360/db/schema/alerts";
import { user } from "@Sentinel360/db/schema/auth";
import { caseEvidence, incident, investigationCase } from "@Sentinel360/db/schema/cases";
import { mediaAsset } from "@Sentinel360/db/schema/evidence";
import { role, userRole } from "@Sentinel360/db/schema/rbac";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

import { recordCaseEvent } from "./case-timeline";
import { recordAuditEvent } from "./audit-log";
import { AI_INCIDENT_STATUS, findIncidentAlert, findLinkedCase, openAiDocket } from "./ai-review";
import { recordWatchlistSuggestions } from "./ai-watchlist";
import { EVIDENCE_ENTITY_TYPE, recordCustodyEvent, sha256Hex } from "./chain-of-custody";
import { deleteEvidenceFile, uploadEvidenceFile } from "./evidence-storage";

// Event types the apps/ai CCTV pipeline can report. PLATE_MATCH is a
// watchlisted licence plate read by apps/ai plates.py (opt-in).
// WATCHLIST_MATCH and metadata.watchlistMatches on any event are face-match
// SUGGESTIONS (apps/ai watchlist.py, opt-in) — stored as entity_match rows
// for an officer to verify, never treated as an identification.
// ALTERCATION comes from the experimental pose rules (apps/ai pose.py).
// ANOMALY_DETECTED comes from the SlowFast model, which the model team flags
// as uncalibrated — apps/ai sends metadata.modelStatus = "experimental".
// PANIC_BUTTON is a person pressing apps/panic at the camera, not a model
// detection: apps/ai attaches whatever the camera saw at that moment.
export const AI_EVENT_TYPES = [
  "WEAPON_DETECTED",
  "ANOMALY_DETECTED",
  "PANIC_BUTTON",
  "ALTERCATION",
  "WATCHLIST_MATCH",
  "PLATE_MATCH",
] as const;
export type AiEventType = (typeof AI_EVENT_TYPES)[number];

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const SEVERITY_BY_EVENT_TYPE: Record<AiEventType, Severity> = {
  WEAPON_DETECTED: "CRITICAL",
  // HIGH rather than CRITICAL: the anomaly model has a known false-positive
  // rate, so it shouldn't outrank a confirmed weapon in the queue.
  ANOMALY_DETECTED: "HIGH",
  // A human asking for help outranks everything the models can report.
  PANIC_BUTTON: "CRITICAL",
  ALTERCATION: "HIGH",
  WATCHLIST_MATCH: "HIGH",
  PLATE_MATCH: "MEDIUM",
};

// Roles that should see AI-generated alerts in their inbox. Mirrors the
// role codes routers/alerts.ts#resolveTargetUserIds maps ADMIN/LAW_ENFORCEMENT/
// SECURITY_OPERATOR targetRoles to, minus COMMUNITY (not relevant to an AI
// detection alert).
const AI_ALERT_RECIPIENT_ROLE_CODES = [
  "security_operator",
  "law_enforcement",
  "admin",
  "super_admin",
];
// Shown as the alert's audience; deliberately not COMMUNITY or ALL, which
// alerts.listMine broadcasts to everyone.
export const AI_ALERT_TARGET_ROLE = "OPERATORS_AND_POLICE";

// FACE: every face in view when the event fired (apps/ai pipeline/faces.py).
// Detection only — no identity is attached, the crops are just evidence.
// PANORAMA: the full 360° equirectangular frame from a panoramic camera,
// shown in the docket's interactive 360° viewer.
// OBJECT: a close-up of each weapon and person in the frame (apps/ai
// pipeline/objects.py), described in the same order by metadata.objects
// ({ label, number, name: "Person 1", view, bbox, confidence }).
export const AI_MEDIA_KINDS = ["SNAPSHOT", "CROP", "FACE", "PANORAMA", "OBJECT"] as const;
export type AiMediaKind = (typeof AI_MEDIA_KINDS)[number];
export const AI_MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// Every image base64-encoded (4/3 overhead) plus the JSON envelope must fit
// Vercel's 4.5 MB request-body cap: 2 x 683 KB + 1.37 MB + 5 x 171 KB +
// 13 x 53 KB + 64 KB ~= 4.45 MB. Real snapshots are 10-350 KB; face crops
// (<= 256 px) ~10-30 KB; object crops (<= 320 px) ~10-30 KB; apps/ai
// shrinks a panorama until it fits MAX_AI_PANORAMA_BYTES.
export const MAX_AI_MEDIA_BYTES = 512 * 1024;
export const MAX_AI_PANORAMA_BYTES = 1024 * 1024;
export const MAX_AI_FACE_BYTES = 128 * 1024;
// Must stay >= face_max_per_event in apps/ai/app/config.py.
export const MAX_AI_FACES = 5;
export const MAX_AI_OBJECT_BYTES = 40 * 1024;
// Must stay >= object_max_weapons + object_max_people in apps/ai/app/config.py.
export const MAX_AI_OBJECTS = 13;
export const AI_MEDIA_LIMITS: Record<AiMediaKind, { maxCount: number; maxBytes: number }> = {
  SNAPSHOT: { maxCount: 1, maxBytes: MAX_AI_MEDIA_BYTES },
  CROP: { maxCount: 1, maxBytes: MAX_AI_MEDIA_BYTES },
  FACE: { maxCount: MAX_AI_FACES, maxBytes: MAX_AI_FACE_BYTES },
  PANORAMA: { maxCount: 1, maxBytes: MAX_AI_PANORAMA_BYTES },
  OBJECT: { maxCount: MAX_AI_OBJECTS, maxBytes: MAX_AI_OBJECT_BYTES },
};
const AI_EVIDENCE_SOURCE = "AI_PIPELINE";

const MEDIA_EXTENSION: Record<(typeof AI_MEDIA_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MEDIA_TITLE: Record<AiMediaKind, string> = {
  SNAPSHOT: "AI snapshot",
  CROP: "AI detection close-up",
  FACE: "AI face capture",
  PANORAMA: "AI 360° panorama",
  OBJECT: "AI capture",
};

export interface AiEventMedia {
  kind: AiMediaKind;
  mimeType: (typeof AI_MEDIA_MIME_TYPES)[number];
  dataBase64: string;
}

export interface AiEventInput {
  cameraId: string;
  eventType: AiEventType;
  confidence: number;
  occurredAt: Date;
  // Generated by apps/ai per detection. Makes retries idempotent: the
  // incident number is derived from it, and incident_number is unique.
  eventId?: string;
  summary?: string;
  location?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  media?: AiEventMedia[];
}

// A repeat of the same event type on the same camera within this window of
// the incident's last detection is added to that incident instead of
// raising a new one: one person holding a knife for a minute is one
// incident with many captures, not a dozen alerts.
export const AI_INCIDENT_GROUP_WINDOW_MS = 10 * 60 * 1000;

// Raised by a person on purpose, so docketed at once. Model detections wait
// for an officer to open a docket or dismiss them (services/ai-review.ts).
export const AI_AUTO_DOCKET_EVENT_TYPES: ReadonlySet<AiEventType> = new Set(["PANIC_BUTTON"]);

export interface AiEventResult {
  incident: typeof incident.$inferSelect;
  // Null until an officer opens a docket (except auto-docketed event types).
  case: typeof investigationCase.$inferSelect | null;
  alert: typeof alert.$inferSelect | null;
  evidenceIds: string[];
  // True when eventId had already been ingested — nothing new was written.
  duplicate: boolean;
  // True when the event was added to an open incident (no new alert).
  merged: boolean;
}

async function resolveAiAlertRecipientIds(): Promise<string[]> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .innerJoin(userRole, eq(userRole.userId, user.id))
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(inArray(role.code, AI_ALERT_RECIPIENT_ROLE_CODES));

  return [...new Set(rows.map((r) => r.id))];
}

function incidentNumberFor(eventId: string | undefined): string {
  if (eventId) return `INC-AI-${eventId}`;
  return `INC-AI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// What one image shows, for its title and filename: "Face 2", or an
// OBJECT's metadata.objects entry ("Knife 1", "Person 3").
interface AiMediaLabel {
  // Stored on the media_asset: { faceNumber } or { objectName, objectLabel }.
  metadata: Record<string, unknown>;
  // Appended to the title ("AI face capture 2") or replacing it for objects.
  title: string;
  fileSuffix: string;
}

interface UploadedAiMedia {
  item: AiEventMedia;
  label: AiMediaLabel | null;
  fileBytes: Buffer;
  fileHash: string;
  originalFilename: string;
  storagePath: string;
}

function objectAt(metadata: Record<string, unknown> | undefined, index: number) {
  const objects = metadata?.objects;
  const entry = Array.isArray(objects) ? objects[index] : undefined;
  if (!entry || typeof entry !== "object") return null;
  const { name, label } = entry as { name?: unknown; label?: unknown };
  return typeof name === "string" && typeof label === "string" ? { name, label } : null;
}

// FACE and OBJECT items are numbered in order, matching metadata.faces /
// metadata.objects; the other kinds have one image each.
function labelAiMedia(media: AiEventMedia[], metadata: Record<string, unknown> | undefined): (AiMediaLabel | null)[] {
  let faces = 0;
  let objects = 0;
  return media.map((item) => {
    if (item.kind === "FACE") {
      faces += 1;
      return { metadata: { faceNumber: faces }, title: `${MEDIA_TITLE.FACE} ${faces}`, fileSuffix: `-${faces}` };
    }
    if (item.kind === "OBJECT") {
      objects += 1;
      const object = objectAt(metadata, objects - 1);
      const name = object?.name ?? `Object ${objects}`;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return {
        metadata: { objectName: name, objectLabel: object?.label ?? null },
        title: `${MEDIA_TITLE.OBJECT}: ${name}`,
        fileSuffix: `-${slug || objects}`,
      };
    }
    return null;
  });
}

async function uploadAiMedia(
  item: AiEventMedia,
  input: AiEventInput,
  label: AiMediaLabel | null,
): Promise<UploadedAiMedia> {
  const fileBytes = Buffer.from(item.dataBase64, "base64");
  const { maxBytes } = AI_MEDIA_LIMITS[item.kind];
  // Validated before upload: uploadEvidenceFile checks size/type only
  // after the bytes are already in the bucket.
  if (fileBytes.length === 0 || fileBytes.length > maxBytes) {
    throw new Error(`${item.kind} is ${fileBytes.length} bytes (max ${maxBytes})`);
  }
  const suffix = label?.fileSuffix ?? "";
  const originalFilename = `${input.cameraId}-${input.eventType.toLowerCase()}-${item.kind.toLowerCase()}${suffix}.${MEDIA_EXTENSION[item.mimeType]}`;
  const { storagePath } = await uploadEvidenceFile(fileBytes, originalFilename, item.mimeType);
  return { item, label, fileBytes, fileHash: sha256Hex(fileBytes), originalFilename, storagePath };
}

/**
 * Stores each image as a READY media_asset (metadata.incidentId ties it to
 * the incident) with a chain-of-custody CREATED row. With a docket, it is
 * also linked to the case with an EVIDENCE_LINKED timeline entry — the
 * same rows routers/evidence.ts#create writes for a manual upload, so AI
 * evidence is handled identically downstream. Without one, openAiDocket
 * links it when an officer opens the docket. Per-item failures are logged
 * and skipped: losing an image must not lose the alert/docket.
 *
 * Storage uploads run in parallel (the slow part against hosted Supabase),
 * but every DB write stays sequential: recordCaseEvent appends to the
 * hash-chained audit_log by reading the latest hash, so concurrent appends
 * would fork the chain.
 */
async function attachAiEvidence(
  caseId: string | null,
  input: AiEventInput,
  incidentId: string,
): Promise<string[]> {
  const media = input.media ?? [];
  const labels = labelAiMedia(media, input.metadata);
  const uploads = await Promise.allSettled(
    media.map((item, index) => uploadAiMedia(item, input, labels[index] ?? null)),
  );
  const evidenceIds: string[] = [];

  for (const [index, upload] of uploads.entries()) {
    if (upload.status === "rejected") {
      console.error(`Failed to upload AI ${media[index]?.kind} evidence for incident ${incidentId}`, upload.reason);
      continue;
    }
    const { item, label, fileBytes, fileHash, originalFilename, storagePath } = upload.value;
    const mediaTitle = label?.title ?? MEDIA_TITLE[item.kind];
    let recorded = false;

    try {
      const [created] = await db
        .insert(mediaAsset)
        .values({
          type: "IMAGE",
          title: `${mediaTitle} — ${input.eventType.replace(/_/g, " ").toLowerCase()}`,
          description: `Auto-captured by the AI monitoring pipeline on camera ${input.cameraId} at ${input.occurredAt.toISOString()}.`,
          source: AI_EVIDENCE_SOURCE,
          sourceCameraId: input.cameraId,
          originalFilename,
          mimeType: item.mimeType,
          fileSize: fileBytes.length,
          fileHash,
          storageUrl: storagePath,
          status: "READY",
          metadata: {
            kind: item.kind,
            eventType: input.eventType,
            eventId: input.eventId,
            confidence: input.confidence,
            incidentId,
            ...input.metadata,
            ...label?.metadata,
          },
          createdByUserId: null,
        })
        .returning();
      if (!created) {
        throw new Error("Evidence record was not created");
      }
      recorded = true;

      await recordCustodyEvent({
        evidenceEntityId: created.id,
        action: "CREATED",
        evidenceHash: fileHash,
        reason: `Auto-captured by AI pipeline (${input.eventType}, camera ${input.cameraId})`,
        location: input.cameraId,
        metadata: { eventId: input.eventId, kind: item.kind, source: AI_EVIDENCE_SOURCE },
      });

      if (caseId) {
        await db.insert(caseEvidence).values({
          caseId,
          evidenceEntityType: EVIDENCE_ENTITY_TYPE,
          evidenceEntityId: created.id,
          relationshipDescription: `${mediaTitle} from AI detection`,
          createdByUserId: null,
        });

        await recordCaseEvent({
          caseId,
          eventType: "EVIDENCE_LINKED",
          summary: `AI evidence captured: ${created.title} (SHA-256 ${fileHash.slice(0, 12)}…)`,
          payload: { evidenceId: created.id, fileHash, mimeType: item.mimeType, source: AI_EVIDENCE_SOURCE },
          actorUserId: null,
        });
      }

      evidenceIds.push(created.id);
    } catch (error) {
      console.error(`Failed to attach AI ${item.kind} evidence to incident ${incidentId}`, error);
      if (!recorded) {
        // No media_asset row points at the file, so don't leave it orphaned
        // in the private bucket. Once a row exists the file must stay.
        await deleteEvidenceFile(storagePath);
      }
    }
  }

  return evidenceIds;
}

function describeEvent(input: AiEventInput): string {
  if (input.eventType === "PANIC_BUTTON") {
    return `Panic button pressed at camera ${input.cameraId}. The camera view at the moment of the press is attached as evidence.`;
  }
  if (input.eventType === "PLATE_MATCH") {
    return `Possible watchlisted licence plate on camera ${input.cameraId} (read with ${(input.confidence * 100).toFixed(0)}% confidence). This is an automated suggestion: an officer must check the plate and vehicle against the close-up before any action is taken.`;
  }
  if (input.eventType === "WATCHLIST_MATCH") {
    return `Possible watchlist match on camera ${input.cameraId} (face similarity ${(input.confidence * 100).toFixed(0)}%). This is an automated suggestion: an officer must verify the identity before any action is taken.`;
  }
  return `Automatically detected by the AI monitoring pipeline on camera ${input.cameraId} (${(input.confidence * 100).toFixed(0)}% confidence).`;
}


function detectionStats(previous: Record<string, unknown>, input: AiEventInput) {
  const count = typeof previous.detectionCount === "number" ? previous.detectionCount : 1;
  const maxConfidence = typeof previous.maxConfidence === "number" ? previous.maxConfidence : 0;
  return {
    detectionCount: count + 1,
    lastDetectedAt: input.occurredAt.toISOString(),
    maxConfidence: Math.max(maxConfidence, input.confidence),
  };
}

// An eventId already stored, as its own incident or as a capture merged
// into another one. Retries must not count or upload it twice.
async function findIngestedEvent(input: AiEventInput, incidentNumber: string) {
  const [own] = await db.select().from(incident).where(eq(incident.incidentNumber, incidentNumber)).limit(1);
  if (own) return own;
  if (!input.eventId) return null;
  const [captured] = await db
    .select({ incidentId: sql<string>`${mediaAsset.metadata}->>'incidentId'` })
    .from(mediaAsset)
    .where(sql`${mediaAsset.metadata}->>'eventId' = ${input.eventId}`)
    .limit(1);
  if (!captured?.incidentId) return null;
  const [merged] = await db.select().from(incident).where(eq(incident.id, captured.incidentId)).limit(1);
  return merged ?? null;
}

async function eventEvidenceIds(eventId: string | undefined): Promise<string[]> {
  if (!eventId) return [];
  const rows = await db
    .select({ id: mediaAsset.id })
    .from(mediaAsset)
    .where(sql`${mediaAsset.metadata}->>'eventId' = ${eventId}`);
  return rows.map((row) => row.id);
}

// The incident still collecting detections of this kind on this camera:
// pending review or already docketed, with a detection inside the window.
async function findOpenIncident(input: AiEventInput) {
  const [open] = await db
    .select()
    .from(incident)
    .where(
      and(
        eq(incident.sourceDomain, "ai_pipeline"),
        eq(incident.sourceEntityId, input.cameraId),
        eq(incident.incidentType, input.eventType),
        inArray(incident.status, [AI_INCIDENT_STATUS.PENDING_REVIEW, AI_INCIDENT_STATUS.DOCKETED]),
        gt(incident.updatedAt, new Date(Date.now() - AI_INCIDENT_GROUP_WINDOW_MS)),
      ),
    )
    .orderBy(desc(incident.updatedAt))
    .limit(1);
  return open ?? null;
}

/**
 * Adds a repeat detection to its open incident: new captures, an updated
 * count on the alert, and no new notifications. If the incident already
 * has a docket, the captures go straight onto it.
 */
async function mergeIntoIncident(open: typeof incident.$inferSelect, input: AiEventInput): Promise<AiEventResult> {
  const [touched] = await db
    .update(incident)
    .set({ updatedAt: new Date() })
    .where(eq(incident.id, open.id))
    .returning();
  const currentAlert = await findIncidentAlert(open.id);
  let updatedAlert = currentAlert;
  if (currentAlert) {
    const metadata = (currentAlert.metadata ?? {}) as Record<string, unknown>;
    const [updated] = await db
      .update(alert)
      .set({ metadata: { ...metadata, ...detectionStats(metadata, input) }, updatedAt: new Date() })
      .where(eq(alert.id, currentAlert.id))
      .returning();
    updatedAlert = updated ?? currentAlert;
  }

  const linkedCase = await findLinkedCase(open.id);
  const evidenceIds = await attachAiEvidence(linkedCase?.id ?? null, input, open.id);
  const watchlistSuggestions = await recordWatchlistSuggestions(open.id, input.metadata);

  await recordAuditEvent({
    eventType: "ai.event_merged",
    domain: "ai_pipeline",
    actorId: null,
    targetEntityType: "INCIDENT",
    targetEntityId: open.id,
    action: "UPDATE",
    payload: {
      eventType: input.eventType,
      eventId: input.eventId,
      cameraId: input.cameraId,
      confidence: input.confidence,
      caseId: linkedCase?.id ?? null,
      evidenceIds,
      watchlistSuggestions,
    },
  });

  return {
    incident: touched ?? open,
    case: linkedCase,
    alert: updatedAlert ?? null,
    evidenceIds,
    duplicate: false,
    merged: true,
  };
}

/**
 * Entry point for apps/ai's POST /internal/ai/events. A new detection
 * writes an incident (PENDING_REVIEW), attaches the snapshot/crop images as
 * evidence, and raises an alert with notification fan-out for an officer to
 * review: they open a docket or dismiss it (services/ai-review.ts). A
 * repeat within AI_INCIDENT_GROUP_WINDOW_MS is added to the same incident
 * instead. A panic press is docketed at once. actorUserId is null
 * throughout: there is no Supabase session on this path, only a
 * shared-secret-authenticated service.
 *
 * Retries with the same eventId return what the first attempt wrote. If an
 * earlier attempt of an auto-docketed event died before its docket was
 * opened, the retry opens it.
 */
export async function ingestAiEvent(input: AiEventInput): Promise<AiEventResult> {
  const severity = SEVERITY_BY_EVENT_TYPE[input.eventType];
  const title = input.summary ?? `${input.eventType.replace(/_/g, " ")} — camera ${input.cameraId}`;
  const description = describeEvent(input);
  const incidentNumber = incidentNumberFor(input.eventId);
  const autoDocket = AI_AUTO_DOCKET_EVENT_TYPES.has(input.eventType);

  const ingested = await findIngestedEvent(input, incidentNumber);
  if (ingested) {
    const linkedCase =
      autoDocket && ingested.incidentNumber === incidentNumber && !(await findLinkedCase(ingested.id))
        ? (await openAiDocket(ingested.id, null)).case
        : await findLinkedCase(ingested.id);
    return {
      incident: ingested,
      case: linkedCase,
      alert: await findIncidentAlert(ingested.id),
      evidenceIds: await eventEvidenceIds(input.eventId),
      duplicate: true,
      merged: ingested.incidentNumber !== incidentNumber,
    };
  }

  if (!autoDocket) {
    const open = await findOpenIncident(input);
    if (open) return mergeIntoIncident(open, input);
  }

  const [insertedIncident] = await db
    .insert(incident)
    .values({
      incidentNumber,
      incidentType: input.eventType,
      title,
      description,
      location: input.location ?? {},
      occurredAt: input.occurredAt,
      severity,
      status: AI_INCIDENT_STATUS.PENDING_REVIEW,
      sourceDomain: "ai_pipeline",
      sourceEntityType: "CAMERA",
      sourceEntityId: input.cameraId,
      reportedByUserId: null,
    })
    .onConflictDoNothing({ target: incident.incidentNumber })
    .returning();
  if (!insertedIncident) {
    // Lost a race with a concurrent retry of the same eventId.
    const [existing] = await db.select().from(incident).where(eq(incident.incidentNumber, incidentNumber)).limit(1);
    if (!existing) throw new Error("Incident was not created");
    return {
      incident: existing,
      case: await findLinkedCase(existing.id),
      alert: await findIncidentAlert(existing.id),
      evidenceIds: [],
      duplicate: true,
      merged: false,
    };
  }

  const [createdAlert] = await db
    .insert(alert)
    .values({
      alertType: input.eventType,
      title,
      message: description,
      severity,
      sourceDomain: "ai_pipeline",
      sourceEntityType: "INCIDENT",
      sourceEntityId: insertedIncident.id,
      location: input.location ?? {},
      metadata: {
        // Not a public broadcast: only AI_ALERT_RECIPIENT_ROLE_CODES get it
        // (notification rows below), and alerts.listMine never shows AI
        // alerts to the community.
        targetRole: AI_ALERT_TARGET_ROLE,
        cameraId: input.cameraId,
        confidence: input.confidence,
        incidentId: insertedIncident.id,
        eventId: input.eventId,
        detectionCount: 1,
        firstDetectedAt: input.occurredAt.toISOString(),
        lastDetectedAt: input.occurredAt.toISOString(),
        maxConfidence: input.confidence,
        review: autoDocket ? { decision: "AUTO" } : { decision: "PENDING" },
        ...input.metadata,
      },
    })
    .returning();
  if (!createdAlert) {
    throw new Error("Alert was not created");
  }

  const recipientIds = await resolveAiAlertRecipientIds();
  if (recipientIds.length > 0) {
    const now = new Date();
    await db.insert(notification).values(
      recipientIds.map((recipientUserId) => ({
        alertId: createdAlert.id,
        recipientUserId,
        channel: "IN_APP",
        title: createdAlert.title,
        body: createdAlert.message,
        deliveryStatus: "DELIVERED",
        sentAt: now,
        deliveredAt: now,
      })),
    );
  }

  // After the alert, not before: operators are notified as soon as the
  // incident exists, and the images land on it moments later. A panic
  // press's docket is opened first so its captures go straight onto it.
  const docket = autoDocket ? (await openAiDocket(insertedIncident.id, null)).case : null;
  const evidenceIds = await attachAiEvidence(docket?.id ?? null, input, insertedIncident.id);
  const watchlistSuggestions = await recordWatchlistSuggestions(insertedIncident.id, input.metadata);

  await recordAuditEvent({
    eventType: "ai.event_ingested",
    domain: "ai_pipeline",
    actorId: null,
    targetEntityType: "INCIDENT",
    targetEntityId: insertedIncident.id,
    action: "CREATE",
    payload: {
      eventType: input.eventType,
      eventId: input.eventId,
      cameraId: input.cameraId,
      confidence: input.confidence,
      caseId: docket?.id ?? null,
      alertId: createdAlert.id,
      evidenceIds,
      watchlistSuggestions,
    },
  });

  return {
    incident: insertedIncident,
    case: docket,
    alert: (await findIncidentAlert(insertedIncident.id)) ?? createdAlert,
    evidenceIds,
    duplicate: false,
    merged: false,
  };
}
