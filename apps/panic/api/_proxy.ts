// Vercel counterpart of the proxy in vite.config.ts: the phone only calls
// /api/*, and these functions forward to apps/ai with the shared key, so the
// key never reaches the browser. AI_SERVICE_URL must be reachable from the
// internet (e.g. Tailscale Funnel on the camera laptop).

// POST /stream/panic waits for a camera frame (up to ~20s if the pipeline
// has to start first).
const TIMEOUT_MS = 30_000;

export async function forward(path: string, init: { method: "GET" | "POST"; withKey: boolean }): Promise<Response> {
  const baseUrl = process.env.AI_SERVICE_URL;
  const apiKey = process.env.AI_SERVICE_API_KEY;
  if (!baseUrl || (init.withKey && !apiKey)) {
    return Response.json({ detail: "Panic service is not configured (AI_SERVICE_URL / AI_SERVICE_API_KEY)" }, { status: 500 });
  }

  try {
    const upstream = await fetch(baseUrl.replace(/\/+$/, "") + path, {
      method: init.method,
      headers: init.withKey ? { "X-Internal-Api-Key": apiKey as string } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(`Camera service unreachable: ${init.method} ${path}`, error);
    return Response.json({ detail: "Camera service unreachable" }, { status: 502 });
  }
}
