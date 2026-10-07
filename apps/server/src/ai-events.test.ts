// Route-level checks for POST /internal/ai/events: auth, validation, body
// limit and status codes. ingestAiEvent is mocked — its DB behaviour is
// covered in packages/api/src/__tests__/ai-ingest.test.ts.
import { beforeEach, describe, expect, it, mock } from "bun:test";

const API_KEY = "test-ai-key";
process.env.AI_SERVICE_API_KEY = API_KEY;
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.CORS_ORIGIN ??= "http://localhost:3001";

const MAX_AI_MEDIA_BYTES = 1.5 * 1024 * 1024;
let ingestResult: Record<string, unknown> = {};
const ingestAiEvent = mock(async (_input: unknown) => ingestResult);

mock.module("@Sentinel360/api/services/ai-ingest", () => ({
  AI_EVENT_TYPES: ["WEAPON_DETECTED", "ANOMALY_DETECTED", "ALTERCATION", "WATCHLIST_MATCH", "PLATE_MATCH"],
  AI_MEDIA_KINDS: ["SNAPSHOT", "CROP"],
  AI_MEDIA_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
  MAX_AI_MEDIA_BYTES,
  ingestAiEvent,
}));

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
    expect((await response.json()).duplicate).toBe(true);
  });

  it("accepts ANOMALY_DETECTED", async () => {
    expect((await post(event({ eventType: "ANOMALY_DETECTED", media: [] }))).status).toBe(201);
  });

  it.each([
    ["unknown event type", { eventType: "FIRE" }],
    ["confidence above 1", { confidence: 1.2 }],
    ["non-uuid eventId", { eventId: "not-a-uuid" }],
    ["unsupported media kind", { media: [{ kind: "VIDEO", mimeType: "image/jpeg", dataBase64: "AA" }] }],
    ["unsupported mime type", { media: [{ kind: "SNAPSHOT", mimeType: "image/gif", dataBase64: "AA" }] }],
    [
      "more than two images",
      { media: Array.from({ length: 3 }, () => ({ kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: "AA" })) },
    ],
  ])("rejects %s with 400", async (_name, overrides) => {
    expect((await post(event(overrides))).status).toBe(400);
    expect(ingestAiEvent).not.toHaveBeenCalled();
  });

  it("keeps the largest valid body under Vercel's 4.5 MB request cap", () => {
    const maxBase64 = Math.ceil(MAX_AI_MEDIA_BYTES / 3) * 4;
    expect(2 * maxBase64 + 64 * 1024).toBeLessThan(4.5 * 1024 * 1024);
  });

  it("rejects a single image over 1.5 MB with 400", async () => {
    const tooBig = "A".repeat(Math.ceil(MAX_AI_MEDIA_BYTES / 3) * 4 + 4);
    const response = await post(event({ media: [{ kind: "SNAPSHOT", mimeType: "image/jpeg", dataBase64: tooBig }] }));
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
