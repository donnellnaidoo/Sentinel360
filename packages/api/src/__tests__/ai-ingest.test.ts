import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@Sentinel360/db";
import { alert, notification } from "@Sentinel360/db/schema/alerts";
import { user } from "@Sentinel360/db/schema/auth";
import { caseEvidence, caseIncident, incident, investigationCase } from "@Sentinel360/db/schema/cases";
import { entityMatch } from "@Sentinel360/db/schema/entities";
import { mediaAsset } from "@Sentinel360/db/schema/evidence";

vi.mock("../services/case-number", () => ({
  insertCaseWithGeneratedNumber: vi.fn(async (values: Record<string, unknown>) => ({
    id: "case-1",
    caseNumber: "S360-2026-00001",
    ...values,
  })),
}));
vi.mock("../services/case-timeline", () => ({ recordCaseEvent: vi.fn() }));
vi.mock("../services/audit-log", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("../services/chain-of-custody", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/chain-of-custody")>()),
  recordCustodyEvent: vi.fn(),
}));
vi.mock("../services/evidence-storage", () => ({
  uploadEvidenceFile: vi.fn(async (_bytes: Buffer, name: string) => ({ storagePath: `2026/${name}` })),
  deleteEvidenceFile: vi.fn(),
}));

import {
  ingestAiEvent,
  MAX_AI_FACE_BYTES,
  MAX_AI_MEDIA_BYTES,
  MAX_AI_PANORAMA_BYTES,
  type AiEventInput,
} from "../services/ai-ingest";
import { insertCaseWithGeneratedNumber } from "../services/case-number";
import { recordCustodyEvent } from "../services/chain-of-custody";
import { deleteEvidenceFile, uploadEvidenceFile } from "../services/evidence-storage";

const EVENT_ID = "33333333-3333-4333-8333-333333333333";
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64");

type Row = Record<string, unknown>;

let insertOrder: unknown[] = [];

/**
 * Minimal drizzle stand-in: records every insert's values per table and
 * answers selects from `selectResults` keyed by the table passed to from().
 */
function fakeDb(
  options: { incidentConflict?: boolean; selectResults?: Map<unknown, Row[]>; failInsertInto?: unknown } = {},
) {
  const inserted = new Map<unknown, Row[]>();
  insertOrder = [];
  let mediaCount = 0;

  vi.mocked(db.insert).mockImplementation(((table: unknown) => ({
    values: (values: Row | Row[]) => {
      if (table === options.failInsertInto) throw new Error("insert failed");
      const rows = Array.isArray(values) ? values : [values];
      insertOrder.push(table);
      inserted.set(table, [...(inserted.get(table) ?? []), ...rows]);

      const returned = rows.map((row) => {
        if (table === mediaAsset) return { id: `media-${++mediaCount}`, ...row };
        if (table === incident) return { id: "incident-1", ...row };
        if (table === alert) return { id: "alert-1", ...row };
        return { id: "row", ...row };
      });
      const result = Promise.resolve(undefined) as Promise<undefined> & Row;
      result.returning = async () => returned;
      result.onConflictDoNothing = () => {
        const conflict = Promise.resolve(undefined) as Promise<undefined> & Row;
        conflict.returning = async () => (table === incident && options.incidentConflict ? [] : returned);
        return conflict;
      };
      return result;
    },
  })) as unknown as typeof db.insert);

  vi.mocked(db.select).mockImplementation((() => {
    let table: unknown;
    const chain: Row = {};
    for (const method of ["innerJoin", "where", "limit", "orderBy"]) chain[method] = () => chain;
    chain.from = (t: unknown) => {
      table = t;
      return chain;
    };
    chain.then = (resolve: (rows: Row[]) => unknown) => resolve(options.selectResults?.get(table) ?? []);
    return chain;
  }) as unknown as typeof db.select);

  return inserted;
}

function event(overrides: Partial<AiEventInput> = {}): AiEventInput {
  return {
    cameraId: "CAM-DEMO-1",
    eventType: "WEAPON_DETECTED",
    confidence: 0.58,
    occurredAt: new Date("2026-10-07T10:00:00Z"),
    eventId: EVENT_ID,
    summary: "Knife detected in Rear view — camera CAM-DEMO-1",
    metadata: { view: "Rear", model: "yolov8n-coco" },
    media: [
      { kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: JPEG },
      { kind: "CROP", mimeType: "image/jpeg", dataBase64: JPEG },
    ],
    ...overrides,
  };
}

describe("ingestAiEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a docket and attaches snapshot + crop as AI evidence with custody", async () => {
    const inserted = fakeDb({ selectResults: new Map([[user, [{ id: "operator-1" }]]]) });

    const result = await ingestAiEvent(event());

    expect(result.duplicate).toBe(false);
    expect(result.evidenceIds).toEqual(["media-1", "media-2"]);
    expect(inserted.get(incident)?.[0]).toMatchObject({
      incidentNumber: `INC-AI-${EVENT_ID}`,
      severity: "CRITICAL",
    });

    const media = inserted.get(mediaAsset) ?? [];
    expect(media).toHaveLength(2);
    expect(media[0]).toMatchObject({
      type: "IMAGE",
      source: "AI_PIPELINE",
      sourceCameraId: "CAM-DEMO-1",
      mimeType: "image/jpeg",
      status: "READY",
      fileSize: 7,
      metadata: expect.objectContaining({ kind: "SNAPSHOT", eventId: EVENT_ID, view: "Rear" }),
    });
    expect(media[0]?.fileHash).toMatch(/^[0-9a-f]{64}$/);

    expect(vi.mocked(recordCustodyEvent)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(recordCustodyEvent).mock.calls[0]?.[0]).toMatchObject({
      evidenceEntityId: "media-1",
      action: "CREATED",
      evidenceHash: media[0]?.fileHash,
    });
    expect(inserted.get(caseEvidence)).toEqual([
      expect.objectContaining({ caseId: "case-1", evidenceEntityType: "MEDIA_ASSET", evidenceEntityId: "media-1" }),
      expect.objectContaining({ caseId: "case-1", evidenceEntityType: "MEDIA_ASSET", evidenceEntityId: "media-2" }),
    ]);
    expect(inserted.get(alert)?.[0]?.metadata).toMatchObject({
      eventId: EVENT_ID,
      caseNumber: "S360-2026-00001",
    });
    expect(inserted.get(notification)).toHaveLength(1);
  });

  it("notifies operators before attaching evidence", async () => {
    fakeDb({ selectResults: new Map([[user, [{ id: "operator-1" }]]]) });

    await ingestAiEvent(event());

    expect(insertOrder.indexOf(notification)).toBeGreaterThan(-1);
    expect(insertOrder.indexOf(notification)).toBeLessThan(insertOrder.indexOf(mediaAsset));
  });

  it("uploads both images before writing any evidence rows", async () => {
    fakeDb();
    let inFlight = 0;
    let maxInFlight = 0;
    vi.mocked(uploadEvidenceFile).mockImplementation(async (_bytes, name) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return { storagePath: `2026/${name}` };
    });

    const result = await ingestAiEvent(event());

    expect(maxInFlight).toBe(2);
    expect(result.evidenceIds).toEqual(["media-1", "media-2"]);
  });

  it("deletes an uploaded file whose evidence row could not be written", async () => {
    fakeDb({ failInsertInto: mediaAsset });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await ingestAiEvent(event());

    expect(result.evidenceIds).toEqual([]);
    expect(vi.mocked(deleteEvidenceFile).mock.calls.map((c) => c[0])).toEqual([
      "2026/CAM-DEMO-1-weapon_detected-snapshot.jpg",
      "2026/CAM-DEMO-1-weapon_detected-crop.jpg",
    ]);
    expect(result.alert).not.toBeNull();
  });

  it("keeps the file once its evidence row exists, even if linking fails", async () => {
    fakeDb({ failInsertInto: caseEvidence });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await ingestAiEvent(event());

    expect(deleteEvidenceFile).not.toHaveBeenCalled();
  });

  it("raises anomaly events as HIGH, not CRITICAL", async () => {
    const inserted = fakeDb();
    await ingestAiEvent(event({ eventType: "ANOMALY_DETECTED", media: [], metadata: { modelStatus: "experimental" } }));

    expect(inserted.get(incident)?.[0]?.severity).toBe("HIGH");
    expect(vi.mocked(insertCaseWithGeneratedNumber).mock.calls[0]?.[0]).toMatchObject({ priority: "HIGH" });
    expect(inserted.get(alert)?.[0]?.metadata).toMatchObject({ modelStatus: "experimental" });
  });

  it("raises panic button presses as CRITICAL with a human-initiated description", async () => {
    const inserted = fakeDb();
    await ingestAiEvent(event({ eventType: "PANIC_BUTTON", confidence: 1 }));

    expect(inserted.get(incident)?.[0]).toMatchObject({ severity: "CRITICAL", incidentType: "PANIC_BUTTON" });
    expect(inserted.get(incident)?.[0]?.description).toMatch(/^Panic button pressed at camera/);
    expect(vi.mocked(insertCaseWithGeneratedNumber).mock.calls[0]?.[0]).toMatchObject({ priority: "CRITICAL" });
  });

  it("returns the original docket for a retried eventId without writing anything new", async () => {
    const existingIncident = { id: "incident-1", incidentNumber: `INC-AI-${EVENT_ID}` };
    const existingCase = { id: "case-1", caseNumber: "S360-2026-00001" };
    const existingAlert = { id: "alert-1" };
    const inserted = fakeDb({
      incidentConflict: true,
      selectResults: new Map<unknown, Row[]>([
        [incident, [existingIncident]],
        [caseIncident, [{ caseId: "case-1" }]],
        [investigationCase, [existingCase]],
        [alert, [existingAlert]],
        [caseEvidence, [{ id: "media-1" }, { id: "media-2" }]],
      ]),
    });

    const result = await ingestAiEvent(event());

    expect(result).toMatchObject({
      duplicate: true,
      case: existingCase,
      alert: existingAlert,
      evidenceIds: ["media-1", "media-2"],
    });
    expect(insertCaseWithGeneratedNumber).not.toHaveBeenCalled();
    expect(uploadEvidenceFile).not.toHaveBeenCalled();
    expect(inserted.get(alert)).toBeUndefined();
  });

  it("resumes a half-ingested event whose incident has no docket yet", async () => {
    fakeDb({
      incidentConflict: true,
      selectResults: new Map<unknown, Row[]>([[incident, [{ id: "incident-1", incidentNumber: `INC-AI-${EVENT_ID}` }]]]),
    });

    const result = await ingestAiEvent(event({ media: [] }));

    expect(result.duplicate).toBe(false);
    expect(insertCaseWithGeneratedNumber).toHaveBeenCalledTimes(1);
  });

  it("keeps the docket and alert when one image fails to upload", async () => {
    const inserted = fakeDb();
    vi.mocked(uploadEvidenceFile).mockRejectedValueOnce(new Error("storage down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await ingestAiEvent(event());

    expect(result.evidenceIds).toEqual(["media-1"]);
    expect(inserted.get(mediaAsset)?.[0]?.metadata).toMatchObject({ kind: "CROP" });
    expect(result.alert).not.toBeNull();
  });

  it("rejects oversize images before they reach storage", async () => {
    fakeDb();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const oversize = Buffer.alloc(MAX_AI_MEDIA_BYTES + 1).toString("base64");

    const result = await ingestAiEvent(event({ media: [{ kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: oversize }] }));

    expect(uploadEvidenceFile).not.toHaveBeenCalled();
    expect(result.evidenceIds).toEqual([]);
  });

  it("stores each face as numbered AI evidence on the case", async () => {
    const inserted = fakeDb();
    const faces = [
      { view: "Front", bbox: [10, 10, 60, 70], confidence: 0.93 },
      { view: "Rear", bbox: [5, 5, 40, 50], confidence: 0.88 },
    ];

    const result = await ingestAiEvent(
      event({
        metadata: { view: "Rear", faces },
        media: [
          { kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: JPEG },
          { kind: "FACE", mimeType: "image/jpeg", dataBase64: JPEG },
          { kind: "FACE", mimeType: "image/jpeg", dataBase64: JPEG },
        ],
      }),
    );

    expect(result.evidenceIds).toEqual(["media-1", "media-2", "media-3"]);
    const media = inserted.get(mediaAsset) ?? [];
    expect(media[1]).toMatchObject({
      title: "AI face capture 1 — weapon detected",
      originalFilename: "CAM-DEMO-1-weapon_detected-face-1.jpg",
      metadata: expect.objectContaining({ kind: "FACE", faceNumber: 1, faces }),
    });
    expect(media[2]).toMatchObject({
      title: "AI face capture 2 — weapon detected",
      metadata: expect.objectContaining({ kind: "FACE", faceNumber: 2 }),
    });
    expect(media[0]?.metadata).not.toHaveProperty("faceNumber");
    expect(inserted.get(caseEvidence)).toHaveLength(3);
  });

  it("rejects a face over the face size cap before it reaches storage", async () => {
    fakeDb();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const oversize = Buffer.alloc(MAX_AI_FACE_BYTES + 1).toString("base64");

    const result = await ingestAiEvent(event({ media: [{ kind: "FACE", mimeType: "image/jpeg", dataBase64: oversize }] }));

    expect(uploadEvidenceFile).not.toHaveBeenCalled();
    expect(result.evidenceIds).toEqual([]);
  });

  it("records watchlist suggestions as entity matches for review, skipping malformed ones", async () => {
    const inserted = fakeDb();
    const profileId = "44444444-4444-4444-8444-444444444444";

    await ingestAiEvent(
      event({
        eventType: "WATCHLIST_MATCH",
        confidence: 0.71,
        metadata: {
          watchlistReview: "required",
          watchlistMatches: [
            { entityProfileId: profileId, similarity: 0.71, faceNumber: 1 },
            { entityProfileId: "not-a-uuid", similarity: 0.9 },
            { entityProfileId: profileId, similarity: "high" },
          ],
        },
      }),
    );

    expect(inserted.get(entityMatch)).toEqual([
      { entityProfileId: profileId, sourceEntityType: "INCIDENT", sourceEntityId: "incident-1", similarityScore: "0.7100" },
    ]);
    expect(inserted.get(incident)?.[0]).toMatchObject({ severity: "HIGH" });
    expect(String(inserted.get(incident)?.[0]?.description)).toContain("an officer must verify the identity");
  });

  it("writes no entity matches for an event without suggestions", async () => {
    const inserted = fakeDb();
    await ingestAiEvent(event());
    expect(inserted.get(entityMatch)).toBeUndefined();
  });

  it("keeps the docket if recording suggestions fails", async () => {
    fakeDb({ failInsertInto: entityMatch });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await ingestAiEvent(
      event({ metadata: { watchlistMatches: [{ entityProfileId: "44444444-4444-4444-8444-444444444444", similarity: 0.5 }] } }),
    );
    expect(result.alert).not.toBeNull();
    expect(result.duplicate).toBe(false);
  });

  it("stores a 360° panorama as its own evidence item, allowing it more bytes than a snapshot", async () => {
    const inserted = fakeDb();
    const panorama = Buffer.alloc(MAX_AI_MEDIA_BYTES + 1, 1).toString("base64");

    const result = await ingestAiEvent(
      event({
        metadata: { view: "Rear", panoramaTarget: { yaw: 170, pitch: 5 } },
        media: [
          { kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: JPEG },
          { kind: "PANORAMA", mimeType: "image/jpeg", dataBase64: panorama },
        ],
      }),
    );

    expect(result.evidenceIds).toEqual(["media-1", "media-2"]);
    expect((inserted.get(mediaAsset) ?? [])[1]).toMatchObject({
      title: "AI 360° panorama — weapon detected",
      originalFilename: "CAM-DEMO-1-weapon_detected-panorama.jpg",
      metadata: expect.objectContaining({ kind: "PANORAMA", panoramaTarget: { yaw: 170, pitch: 5 } }),
    });
  });

  it("rejects a panorama over its cap before it reaches storage", async () => {
    fakeDb();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const oversize = Buffer.alloc(MAX_AI_PANORAMA_BYTES + 1).toString("base64");

    const result = await ingestAiEvent(
      event({ media: [{ kind: "PANORAMA", mimeType: "image/jpeg", dataBase64: oversize }] }),
    );

    expect(uploadEvidenceFile).not.toHaveBeenCalled();
    expect(result.evidenceIds).toEqual([]);
  });

  it("records a plate match as a suggestion with a verify-first description", async () => {
    const inserted = fakeDb();
    const profileId = "55555555-5555-4555-8555-555555555555";

    await ingestAiEvent(
      event({
        eventType: "PLATE_MATCH",
        confidence: 0.93,
        summary: "Possible plate match: CA 123-456 (Getaway car) — camera CAM-DEMO-1 (verify)",
        metadata: {
          plateRead: "CA123456",
          plateListed: "CA 123-456",
          watchlistReview: "required",
          watchlistMatches: [{ entityProfileId: profileId, similarity: 0.93, plate: "CA 123-456" }],
        },
      }),
    );

    expect(inserted.get(entityMatch)).toEqual([
      { entityProfileId: profileId, sourceEntityType: "INCIDENT", sourceEntityId: "incident-1", similarityScore: "0.9300" },
    ]);
    expect(inserted.get(incident)?.[0]).toMatchObject({ severity: "MEDIUM", incidentType: "PLATE_MATCH" });
    expect(String(inserted.get(incident)?.[0]?.description)).toContain("check the plate and vehicle");
  });
});
