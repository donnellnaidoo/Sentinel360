// Route-level checks for POST /internal/ai/events: auth, validation, body
// limit and status codes. ingestAiEvent is mocked — its DB behaviour is
// covered in packages/api/src/__tests__/ai-ingest.test.ts.
import { beforeEach, describe, expect, it, mock } from "bun:test";

const API_KEY = "test-ai-key";
process.env.AI_SERVICE_API_KEY = API_KEY;
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.CORS_ORIGIN ??= "http://localhost:3001";

const MAX_AI_MEDIA_BYTES = 1024 * 1024;
const MAX_AI_FACE_BYTES = 128 * 1024;
const AI_MEDIA_LIMITS = {
  SNAPSHOT: { maxCount: 1, maxBytes: MAX_AI_MEDIA_BYTES },
  CROP: { maxCount: 1, maxBytes: MAX_AI_MEDIA_BYTES },
  FACE: { maxCount: 5, maxBytes: MAX_AI_FACE_BYTES },
};
const base64Length = (bytes: number) => Math.ceil(bytes / 3) * 4;
let ingestResult: Record<string, unknown> = {};
const ingestAiEvent = mock(async (_input: unknown) => ingestResult);

mock.module("@Sentinel360/api/services/ai-ingest", () => ({
  AI_EVENT_TYPES: ["WEAPON_DETECTED", "ANOMALY_DETECTED", "PANIC_BUTTON", "ALTERCATION", "WATCHLIST_MATCH", "PLATE_MATCH"],
  AI_MEDIA_KINDS: ["SNAPSHOT", "CROP", "FACE"],
  AI_MEDIA_LIMITS,
  AI_MEDIA_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ingestAiEvent,
}));

let watchlistItems: unknown[] = [];
const listAiWatchlist = mock(async () => watchlistItems);
mock.module("@Sentinel360/api/services/ai-watchlist", () => ({ listAiWatchlist }));

const { default: app } = await import("./index");

const EVENT_ID = "33333333-3333-4333-8333-333333333333";

function post(body: unknown, key: string | null = API_KEY) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key !== null) headers["X-Internal-Api-Key"] = key;
  return app.request("/internal/ai/events", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    eventId: EVENT_ID,
    cameraId: "CAM-DEMO-1",
    eventType: "WEAPON_DETECTED",
    confidence: 0.58,
    occurredAt: "2026-10-07T10:00:00+00:00",
    summary: "Knife detected — camera CAM-DEMO-1",
    metadata: { view: "Main" },
    media: [{ kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: "/9j/4AAQ" }],
    ...overrides,
  };
}

function created(duplicate: boolean) {
  return {
    incident: { id: "incident-1" },
    case: { id: "case-1", caseNumber: "S360-2026-00001" },
    alert: { id: "alert-1" },
    evidenceIds: ["media-1"],
    duplicate,
  };
}

describe("POST /internal/ai/events", () => {
  beforeEach(() => {
    ingestAiEvent.mockClear();
    ingestResult = created(false);
  });

  it("rejects a missing or wrong key before parsing", async () => {
    expect((await post(event(), null)).status).toBe(401);
    expect((await post(event(), "wrong-key")).status).toBe(401);
    expect(ingestAiEvent).not.toHaveBeenCalled();
  });

  it("returns 201 with the docket and evidence ids", async () => {
    const response = await post(event());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      incidentId: "incident-1",
      caseId: "case-1",
      caseNumber: "S360-2026-00001",
      alertId: "alert-1",
      evidenceIds: ["media-1"],
      duplicate: false,
    });

    const input = ingestAiEvent.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(input.eventId).toBe(EVENT_ID);
    expect(input.occurredAt).toBeInstanceOf(Date);
  });

  it("returns 200 for a retried eventId", async () => {
    ingestResult = created(true);
    const response = await post(event());
    expect(response.status).toBe(200);
    expect(((await response.json()) as { duplicate: boolean }).duplicate).toBe(true);
  });

  it("accepts ANOMALY_DETECTED", async () => {
    expect((await post(event({ eventType: "ANOMALY_DETECTED", media: [] }))).status).toBe(201);
  });

  it("accepts PANIC_BUTTON", async () => {
    expect((await post(event({ eventType: "PANIC_BUTTON", confidence: 1 }))).status).toBe(201);
  });

  it.each([
    ["unknown event type", { eventType: "FIRE" }],
    ["confidence above 1", { confidence: 1.2 }],
    ["non-uuid eventId", { eventId: "not-a-uuid" }],
    ["unsupported media kind", { media: [{ kind: "VIDEO", mimeType: "image/jpeg", dataBase64: "AA" }] }],
    ["unsupported mime type", { media: [{ kind: "SNAPSHOT", mimeType: "image/gif", dataBase64: "AA" }] }],
    [
      "two snapshots",
      { media: Array.from({ length: 2 }, () => ({ kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: "AA" })) },
    ],
    [
      "more than five faces",
      { media: Array.from({ length: 6 }, () => ({ kind: "FACE", mimeType: "image/jpeg", dataBase64: "AA" })) },
    ],
  ])("rejects %s with 400", async (_name, overrides) => {
    expect((await post(event(overrides))).status).toBe(400);
    expect(ingestAiEvent).not.toHaveBeenCalled();
  });

  it("accepts a snapshot, a crop and five faces", async () => {
    const media = [
      { kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: "/9j/4AAQ" },
      { kind: "CROP", mimeType: "image/jpeg", dataBase64: "/9j/4AAQ" },
      ...Array.from({ length: 5 }, () => ({ kind: "FACE", mimeType: "image/jpeg", dataBase64: "/9j/4AAQ" })),
    ];
    expect((await post(event({ media }))).status).toBe(201);
    expect((ingestAiEvent.mock.calls[0]?.[0] as { media: unknown[] }).media).toHaveLength(7);
  });

  it("keeps the largest valid body under Vercel's 4.5 MB request cap", async () => {
    const media = [
      { kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: "A".repeat(base64Length(MAX_AI_MEDIA_BYTES)) },
      { kind: "CROP", mimeType: "image/jpeg", dataBase64: "A".repeat(base64Length(MAX_AI_MEDIA_BYTES)) },
      ...Array.from({ length: 5 }, () => ({
        kind: "FACE",
        mimeType: "image/jpeg",
        dataBase64: "A".repeat(base64Length(MAX_AI_FACE_BYTES)),
      })),
    ];
    const body = JSON.stringify(event({ media }));
    expect(body.length).toBeLessThan(4.5 * 1024 * 1024);
    expect((await post(body)).status).toBe(201);
  });

  it("rejects a snapshot over 1 MB with 400", async () => {
    const tooBig = "A".repeat(base64Length(MAX_AI_MEDIA_BYTES) + 4);
    const response = await post(event({ media: [{ kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: tooBig }] }));
    expect(response.status).toBe(400);
  });

  it("rejects a face over 128 KB with 400", async () => {
    const tooBig = "A".repeat(base64Length(MAX_AI_FACE_BYTES) + 4);
    const response = await post(event({ media: [{ kind: "FACE", mimeType: "image/jpeg", dataBase64: tooBig }] }));
    expect(response.status).toBe(400);
  });

  it("rejects an oversized body with 413", async () => {
    const huge = "A".repeat(6 * 1024 * 1024);
    const response = await post(event({ summary: huge }));
    expect(response.status).toBe(413);
    expect(ingestAiEvent).not.toHaveBeenCalled();
  });

  it("returns 500 without leaking the error when ingestion fails", async () => {
    ingestAiEvent.mockImplementationOnce(async () => {
      throw new Error("db password=hunter2");
    });
    const spy = mock(() => {});
    const original = console.error;
    console.error = spy;
    try {
      const response = await post(event());
      expect(response.status).toBe(500);
      expect(await response.text()).not.toContain("hunter2");
    } finally {
      console.error = original;
    }
  });
});

describe("GET /internal/ai/watchlist", () => {
  const get = (key: string | null = API_KEY) =>
    app.request("/internal/ai/watchlist", { headers: key === null ? {} : { "X-Internal-Api-Key": key } });

  beforeEach(() => {
    listAiWatchlist.mockClear();
    watchlistItems = [
      { entityProfileId: "p1", displayName: "One", photoUrl: "https://x/p1.jpg", priorityLevel: "HIGH" },
    ];
  });

  it("requires the internal key", async () => {
    expect((await get(null)).status).toBe(401);
    expect((await get("wrong-key")).status).toBe(401);
    expect(listAiWatchlist).not.toHaveBeenCalled();
  });

  it("returns the wanted persons with photos", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: watchlistItems });
  });

  it("returns 500 when the lookup fails", async () => {
    listAiWatchlist.mockImplementationOnce(async () => {
      throw new Error("db down");
    });
    const spy = console.error;
    console.error = () => {};
    const res = await get();
    console.error = spy;
    expect(res.status).toBe(500);
  });
});
