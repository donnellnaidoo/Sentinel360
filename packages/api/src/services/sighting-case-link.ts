import { db } from "@Sentinel360/db";
import { alert, notification } from "@Sentinel360/db/schema/alerts";
import {
  caseCriminal,
  caseEvidence,
  caseIncident,
  incident,
  investigationCase,
} from "@Sentinel360/db/schema/cases";
import { entityProfile, watchlistEntry } from "@Sentinel360/db/schema/entities";
import { mediaAsset } from "@Sentinel360/db/schema/evidence";
import type { communitySighting } from "@Sentinel360/db/schema/sightings";
import { and, eq, inArray } from "drizzle-orm";

import { recordCaseEvent } from "./case-timeline";
import { recordCustodyEvent } from "./chain-of-custody";
import { mergeSuggestedCaseIds } from "./sighting-case-link-rules";

type SightingRow = typeof communitySighting.$inferSelect;
type CaseRow = typeof investigationCase.$inferSelect;
type IncidentRow = typeof incident.$inferSelect;

/**
 * Cases a wanted person is tied to, for the moderator to pick from when the
 * sighting is approved: the case on each active watchlist entry, then any
 * case they're linked to via case_criminal. Nothing is linked here.
 */
export async function findSuggestedCaseIds(entityProfileId: string): Promise<string[]> {
  const watchlistRows = await db
    .select({ caseId: watchlistEntry.caseId })
    .from(watchlistEntry)
    .where(
      and(eq(watchlistEntry.entityProfileId, entityProfileId), eq(watchlistEntry.status, "ACTIVE")),
    );
  const criminalRows = await db
    .select({ caseId: caseCriminal.caseId })
    .from(caseCriminal)
    .where(eq(caseCriminal.entityProfileId, entityProfileId));

  const candidateIds = [
    ...new Set(
      [...watchlistRows.map((r) => r.caseId), ...criminalRows.map((r) => r.caseId)].filter(
        (id): id is string => typeof id === "string",
      ),
    ),
  ];
  if (candidateIds.length === 0) return [];

  const caseRows = await db
    .select({ id: investigationCase.id, status: investigationCase.status })
    .from(investigationCase)
    .where(inArray(investigationCase.id, candidateIds));

  return mergeSuggestedCaseIds(
    watchlistRows.map((r) => r.caseId),
    criminalRows.map((r) => r.caseId),
    new Map(caseRows.map((r) => [r.id, r.status])),
  );
}

function generateSightingIncidentNumber(): string {
  return `INC-SGT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Turns an approved sighting into an incident, the unit cases link to (the
 * same shape ai-ingest.ts uses for camera detections). reportedByUserId
 * stays null for anonymous reports so the incident can't reveal who filed it.
 */
export async function createIncidentForSighting(sighting: SightingRow): Promise<IncidentRow> {
  let subjectName: string | null = null;
  if (sighting.subjectEntityProfileId) {
    const [subject] = await db
      .select({ displayName: entityProfile.displayName })
      .from(entityProfile)
      .where(eq(entityProfile.id, sighting.subjectEntityProfileId))
      .limit(1);
    subjectName = subject?.displayName ?? null;
  }

  const [created] = await db
    .insert(incident)
    .values({
      incidentNumber: generateSightingIncidentNumber(),
      incidentType: sighting.sightingType,
      title: subjectName
        ? `Community sighting of ${subjectName} (${sighting.referenceCode})`
        : `Community sighting ${sighting.referenceCode}`,
      description: sighting.description,
      location: sighting.location ?? {},
      occurredAt: sighting.occurredAt ?? sighting.reportedAt ?? sighting.createdAt,
      severity: sighting.severity ?? "MEDIUM",
      status: "REPORTED",
      sourceDomain: "community_sightings",
      sourceEntityType: "COMMUNITY_SIGHTING",
      sourceEntityId: sighting.id,
      reportedByUserId: sighting.isAnonymous ? null : sighting.reporterUserId,
    })
    .returning();
  if (!created) {
    throw new Error("Incident was not created");
  }
  return created;
}

function readMediaIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

/**
 * Attaches the sighting's photos to the case as evidence and records a
 * TRANSFERRED custody event for each, so they're tracked like any other
 * case evidence from this point on. Returns how many were attached.
 */
async function attachSightingPhotosToCase(
  sighting: SightingRow,
  caseRow: CaseRow,
  actorUserId: string,
): Promise<number> {
  const mediaIds = readMediaIds(sighting.mediaIds);
  if (mediaIds.length === 0) return 0;

  const media = await db
    .select({ id: mediaAsset.id, fileHash: mediaAsset.fileHash })
    .from(mediaAsset)
    .where(inArray(mediaAsset.id, mediaIds));

  for (const item of media) {
    await db.insert(caseEvidence).values({
      caseId: caseRow.id,
      evidenceEntityType: "MEDIA_ASSET",
      evidenceEntityId: item.id,
      relationshipDescription: `Photo from community sighting ${sighting.referenceCode}`,
      createdByUserId: actorUserId,
    });

    await recordCustodyEvent({
      evidenceEntityId: item.id,
      action: "TRANSFERRED",
      evidenceHash: item.fileHash,
      reason: `Attached to case ${caseRow.caseNumber} from community sighting ${sighting.referenceCode}`,
      toUserId: actorUserId,
      metadata: { caseId: caseRow.id, sightingId: sighting.id },
    });

    await recordCaseEvent({
      caseId: caseRow.id,
      eventType: "EVIDENCE_LINKED",
      summary: `Sighting photo linked to case (${sighting.referenceCode})`,
      payload: { evidenceEntityType: "MEDIA_ASSET", evidenceEntityId: item.id, sightingId: sighting.id },
      actorUserId,
    });
  }
  return media.length;
}

// Personal in-app alert to the case's assigned investigator. Skipped when
// nobody is assigned or the moderator is the investigator themselves.
async function notifyAssignedInvestigator(
  caseRow: CaseRow,
  sighting: SightingRow,
  incidentRow: IncidentRow,
  actorUserId: string,
): Promise<void> {
  const recipientUserId = caseRow.assignedToUserId;
  if (!recipientUserId || recipientUserId === actorUserId) return;

  const title = `New sighting linked to ${caseRow.caseNumber}`;
  const message = `Community sighting ${sighting.referenceCode} was approved and linked to case ${caseRow.caseNumber} (${caseRow.title}).`;

  const [created] = await db
    .insert(alert)
    .values({
      alertType: "SIGHTING_LINKED_TO_CASE",
      title,
      message,
      severity: "MEDIUM",
      sourceDomain: "COMMUNITY_SIGHTING",
      sourceEntityType: "CASE",
      sourceEntityId: caseRow.id,
      location: sighting.location ?? {},
      metadata: {
        targetRole: "PERSONAL",
        createdByUserId: actorUserId,
        caseId: caseRow.id,
        incidentId: incidentRow.id,
        sightingId: sighting.id,
      },
    })
    .returning();
  if (!created) return;

  const now = new Date();
  await db.insert(notification).values({
    alertId: created.id,
    recipientUserId,
    channel: "IN_APP",
    title,
    body: message,
    deliveryStatus: "DELIVERED",
    sentAt: now,
    deliveredAt: now,
    actionUrl: `/docket/${caseRow.id}`,
  });
}

/**
 * Links a sighting's incident to a case: case_incident row, INCIDENT_LINKED
 * timeline entry, optional photo evidence, and a notification to the
 * assigned investigator. The caller is responsible for the visibility and
 * permission checks on caseRow (getCaseOrThrow).
 */
export async function linkSightingIncidentToCase(input: {
  sighting: SightingRow;
  incident: IncidentRow;
  caseRow: CaseRow;
  actorUserId: string;
  attachPhotos: boolean;
}): Promise<{ photosAttached: number }> {
  const { sighting, caseRow, actorUserId } = input;

  await db
    .insert(caseIncident)
    .values({ caseId: caseRow.id, incidentId: input.incident.id })
    .onConflictDoNothing();

  await recordCaseEvent({
    caseId: caseRow.id,
    eventType: "INCIDENT_LINKED",
    summary: `Community sighting ${sighting.referenceCode} linked to case (incident ${input.incident.incidentNumber})`,
    payload: { incidentId: input.incident.id, sightingId: sighting.id },
    actorUserId,
  });

  const photosAttached = input.attachPhotos
    ? await attachSightingPhotosToCase(sighting, caseRow, actorUserId)
    : 0;

  await notifyAssignedInvestigator(caseRow, sighting, input.incident, actorUserId);

  return { photosAttached };
}
