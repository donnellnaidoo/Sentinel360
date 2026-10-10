import { timingSafeEqual } from "node:crypto";

import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@Sentinel360/api/context";
import { appRouter } from "@Sentinel360/api/routers/index";
import {
  AI_EVENT_TYPES,
  AI_MEDIA_KINDS,
  AI_MEDIA_LIMITS,
  AI_MEDIA_MIME_TYPES,
  ingestAiEvent,
} from "@Sentinel360/api/services/ai-ingest";
import { listAiWatchlist } from "@Sentinel360/api/services/ai-watchlist";
import { env } from "@Sentinel360/env/server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";

const app = new Hono();

// tRPC is mounted at /trpc. Workspace package changes may require a server restart.

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

// apps/ai posts detection events here. This is a plain Hono route rather
// than a tRPC procedure: context.ts only resolves Supabase user JWTs, and
// there is no user session on this path — just a trusted service
// authenticated with a shared secret (see ingestAiEvent's doc comment).
// base64 is 4/3 the size of the bytes it encodes.
const base64Length = (bytes: number) => Math.ceil(bytes / 3) * 4;
const MAX_AI_MEDIA_COUNT = AI_MEDIA_KINDS.reduce((sum, kind) => sum + AI_MEDIA_LIMITS[kind].maxCount, 0);

const aiEventSchema = z.object({
  cameraId: z.string().min(1),
  eventType: z.enum(AI_EVENT_TYPES),
  confidence: z.number().min(0).max(1),
  occurredAt: z.coerce.date(),
  summary: z.string().max(500).optional(),
  location: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Optional for backwards compatibility; apps/ai always sends one so its
  // retries can't open duplicate dockets (see ingestAiEvent).
  eventId: z.string().uuid().optional(),
  // Snapshot / clean crop / face crops, attached to the docket as evidence.
  // Size and count are limited per kind (AI_MEDIA_LIMITS).
  media: z
    .array(
      z
        .object({
          kind: z.enum(AI_MEDIA_KINDS),
          mimeType: z.enum(AI_MEDIA_MIME_TYPES),
          dataBase64: z.string().min(1),
        })
        .refine((item) => item.dataBase64.length <= base64Length(AI_MEDIA_LIMITS[item.kind].maxBytes), {
          message: "Image too large for its kind",
          path: ["dataBase64"],
        }),
    )
    .max(MAX_AI_MEDIA_COUNT)
    .superRefine((media, ctx) => {
      for (const kind of AI_MEDIA_KINDS) {
        const count = media.filter((item) => item.kind === kind).length;
        if (count > AI_MEDIA_LIMITS[kind].maxCount) {
          ctx.addIssue({ code: "custom", message: `At most ${AI_MEDIA_LIMITS[kind].maxCount} ${kind} image(s)` });
        }
      }
    })
    .optional(),
});

function isValidInternalApiKey(provided: string | undefined): boolean {
  if (!provided) return false;
  const expected = Buffer.from(env.AI_SERVICE_API_KEY);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Room for every max-size base64 image plus the JSON envelope.
const AI_EVENT_MAX_BODY_BYTES =
  AI_MEDIA_KINDS.reduce(
    (sum, kind) => sum + AI_MEDIA_LIMITS[kind].maxCount * base64Length(AI_MEDIA_LIMITS[kind].maxBytes),
    0,
  ) +
  64 * 1024;
const aiEventBodyLimit = bodyLimit({
  maxSize: AI_EVENT_MAX_BODY_BYTES,
  onError: (c) => c.json({ error: "Payload too large" }, 413),
});

app.post("/internal/ai/events", aiEventBodyLimit, async (c) => {
  if (!isValidInternalApiKey(c.req.header("X-Internal-Api-Key"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = aiEventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  try {
    const result = await ingestAiEvent(parsed.data);
    return c.json(
      {
        incidentId: result.incident.id,
        caseId: result.case.id,
        caseNumber: result.case.caseNumber,
        alertId: result.alert?.id ?? null,
        evidenceIds: result.evidenceIds,
        duplicate: result.duplicate,
      },
      // 200 for a retried eventId: nothing new was created.
      result.duplicate ? 200 : 201,
    );
  } catch (error) {
    console.error("Failed to ingest AI event", error);
    return c.json({ error: "Failed to ingest event" }, 500);
  }
});

// apps/ai's watchlist face matching (opt-in) fetches the wanted persons'
// photos here. Same shared-secret auth as /internal/ai/events.
app.get("/internal/ai/watchlist", async (c) => {
  if (!isValidInternalApiKey(c.req.header("X-Internal-Api-Key"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    return c.json({ items: await listAiWatchlist() });
  } catch (error) {
    console.error("Failed to list the AI watchlist", error);
    return c.json({ error: "Failed to list watchlist" }, 500);
  }
});

export default app;
