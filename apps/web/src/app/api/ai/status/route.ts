import { aiServiceUnavailable, denyUnlessConsoleUser, fetchAiService, relayJson } from "@/lib/ai-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessConsoleUser();
  if (denied) return denied;

  try {
    return await relayJson(await fetchAiService("/stream/status"));
  } catch (error) {
    return aiServiceUnavailable(error);
  }
}
