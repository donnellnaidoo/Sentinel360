import { forward } from "../_proxy.js";

export function GET(request: Request): Promise<Response> {
  const eventId = new URL(request.url).pathname.split("/").pop() ?? "";
  return forward(`/stream/panic/${encodeURIComponent(decodeURIComponent(eventId))}`, { method: "GET", withKey: true });
}
