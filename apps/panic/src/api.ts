// Proxied by vite.config.ts to apps/ai: /api/panic -> /stream/panic.

export interface PanicStatus {
  event_id: string;
  // True when the press landed inside apps/ai's cooldown and joined the
  // previous press instead of opening another docket.
  repeated: boolean;
  state: "queued" | "sent" | "failed";
  caseNumber?: string;
  error?: string;
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { detail?: string } | null;
  return body?.detail ?? `HTTP ${response.status}`;
}

export async function pressPanic(): Promise<PanicStatus> {
  const response = await fetch("/api/panic", { method: "POST" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as PanicStatus;
}

export async function getPanicStatus(eventId: string): Promise<PanicStatus> {
  const response = await fetch(`/api/panic/${encodeURIComponent(eventId)}`);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as PanicStatus;
}

export async function isCameraServiceUp(): Promise<boolean> {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
