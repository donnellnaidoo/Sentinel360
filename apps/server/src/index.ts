import { timingSafeEqual } from "node:crypto";

import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@Sentinel360/api/context";
import { appRouter } from "@Sentinel360/api/routers/index";
import { AI_EVENT_TYPES, ingestAiEvent } from "@Sentinel360/api/services/ai-ingest";
import { env } from "@Sentinel360/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";

const app = new Hono();

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
const aiEventSchema = z.object({
  cameraId: z.string().min(1),
  eventType: z.enum(AI_EVENT_TYPES),
  confidence: z.number().min(0).max(1),
  occurredAt: z.coerce.date(),
  summary: z.string().max(500).optional(),
  location: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function isValidInternalApiKey(provided: string | undefined): boolean {
  if (!provided) return false;
  const expected = Buffer.from(env.AI_SERVICE_API_KEY);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

app.post("/internal/ai/events", async (c) => {
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
        alertId: result.alert.id,
      },
      201,
    );
  } catch (error) {
    console.error("Failed to ingest AI event", error);
    return c.json({ error: "Failed to ingest event" }, 500);
  }
});

export default app;
