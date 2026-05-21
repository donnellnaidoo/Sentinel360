import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@Sentinel360/api/context";
import { appRouter } from "@Sentinel360/api/routers/index";
import { auth } from "@Sentinel360/auth";
import { env } from "@Sentinel360/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

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

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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

// AI service proxy endpoints
const AI_SERVICE = process.env.AI_SERVICE_URL || "http://localhost:8000";

app.post("/api/analyze", async (c) => {
  try {
    const body =
      (await c.req.raw.blob?.()) || (await c.req.raw.arrayBuffer?.());
  } catch (e) {
    // fallthrough
  }

  // forward multipart form data from client to AI service
  const req = c.req;
  const form = await req.formData();
  const forwarded = new FormData();
  // accept field `frame` or `image`
  const frame = form.get("frame") || form.get("image");
  if (frame) {
    forwarded.set("frame", frame as any);
  }

  const resp = await fetch(`${AI_SERVICE}/analyze-frame`, {
    method: "POST",
    body: forwarded,
  });
  const json = await resp.json();
  return c.json(json, resp.status);
});

app.get("/api/events", async (c) => {
  const resp = await fetch(`${AI_SERVICE}/events`);
  const json = await resp.json();
  return c.json(json);
});

app.get("/api/live-stream", async (c) => {
  // Proxy AI service raw stream if available, otherwise fallback
  const AI_SERVICE = process.env.AI_SERVICE_URL || "http://localhost:8000";

  try {
    // First try to get the demo stream (local video if available)
    const demoResp = await fetch(`${AI_SERVICE}/demo-stream`);
    if (demoResp.ok) {
      const buffer = await demoResp.arrayBuffer();
      return c.body(buffer, 200, {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache",
      });
    }
  } catch (e) {
    // demo stream not available, continue
  }

  try {
    // Fall back to raw stream proxy (YouTube)
    const resp = await fetch(`${AI_SERVICE}/raw-stream`);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      return c.body(buffer, 200, {
        "Content-Type": resp.headers.get("content-type") || "video/mp4",
        "Cache-Control": "no-cache",
      });
    }
  } catch (e) {
    // raw stream failed, continue
  }

  // Final fallback: redirect to YouTube
  return c.redirect("https://www.youtube.com/watch?v=ZMBj8CnNR8M");
});

export default app;
