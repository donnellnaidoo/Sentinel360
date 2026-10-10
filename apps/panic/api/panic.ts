import { forward } from "./_proxy.js";

export function POST(): Promise<Response> {
  return forward("/stream/panic", { method: "POST", withKey: true });
}
