import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@Sentinel360/db";
import { alert, notification } from "@Sentinel360/db/schema/alerts";
import { user } from "@Sentinel360/db/schema/auth";
import { caseEvidence, caseIncident, incident, investigationCase } from "@Sentinel360/db/schema/cases";
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

import { ingestAiEvent, MAX_AI_MEDIA_BYTES, type AiEventInput } from "../services/ai-ingest";
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
});
