import { NextResponse } from "next/server";

import { aiServiceUnavailable, denyUnlessConsoleUser, fetchAiService } from "@/lib/ai-service";

export const dynamic = "force-dynamic";
// The monitoring page reopens the stream every 270s, inside this limit
// (300s is the Vercel Hobby maximum).
export const maxDuration = 300;

// Streams the AI service's MJPEG feed through to an <img> on the monitoring
// page, so the browser never needs the internal key or the service's address.
export async function GET(request: Request) {
  const denied = await denyUnlessConsoleUser();
  if (denied) return denied;

  let upstream: Response;
  try {
    // Aborting with the browser request closes the upstream generator when
    // the operator leaves the page.
    upstream = await fetchAiService("/stream/mjpeg", { signal: request.signal });
  } catch (error) {
    return aiServiceUnavailable(error);
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `AI service returned ${upstream.status}` }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-store",
    },
  });
}
