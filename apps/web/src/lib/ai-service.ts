import { env } from "@Sentinel360/env/web";
import { NextResponse } from "next/server";

import { getConsoleRole } from "@/lib/auth/console-role";
import { createClient } from "@/lib/supabase/server";

// Server-side access to apps/ai for the /api/ai/* proxy routes. The browser
// never talks to the AI service directly: its camera control and live feed
// have no user auth of their own, only the shared internal key, which must
// stay on the server.

/** null when the caller may use the console, otherwise the error response. */
export async function denyUnlessConsoleUser(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await getConsoleRole(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export class AiServiceUnavailableError extends Error {}

export async function fetchAiService(path: string, init: RequestInit = {}): Promise<Response> {
  if (!env.AI_SERVICE_API_KEY) {
    throw new AiServiceUnavailableError("AI_SERVICE_API_KEY is not set for apps/web");
  }
  try {
    return await fetch(new URL(path, env.AI_SERVICE_URL), {
      ...init,
      headers: { ...init.headers, "X-Internal-Api-Key": env.AI_SERVICE_API_KEY },
      cache: "no-store",
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new AiServiceUnavailableError(`AI service unreachable at ${env.AI_SERVICE_URL}`);
  }
}

export function aiServiceUnavailable(error: unknown): NextResponse {
  if (error instanceof AiServiceUnavailableError) {
    return NextResponse.json({ error: error.message, offline: true }, { status: 503 });
  }
  throw error;
}

/** Relays a JSON response from the AI service with its status code. */
export async function relayJson(response: Response): Promise<NextResponse> {
  const body = await response.json().catch(() => ({ error: `AI service returned ${response.status}` }));
  return NextResponse.json(body, { status: response.status });
}
