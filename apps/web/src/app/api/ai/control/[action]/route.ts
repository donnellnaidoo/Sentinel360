import { NextResponse } from "next/server";

import { aiServiceUnavailable, denyUnlessConsoleUser, fetchAiService, relayJson } from "@/lib/ai-service";

const ACTIONS = new Set(["start", "stop"]);

export async function POST(_request: Request, { params }: { params: Promise<{ action: string }> }) {
  const denied = await denyUnlessConsoleUser();
  if (denied) return denied;

  const { action } = await params;
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  }

  try {
    return await relayJson(await fetchAiService(`/stream/${action}`, { method: "POST" }));
  } catch (error) {
    return aiServiceUnavailable(error);
  }
}
