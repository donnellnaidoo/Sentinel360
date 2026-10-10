import { forward } from "./_proxy.js";

export function GET(): Promise<Response> {
  return forward("/health", { method: "GET", withKey: false });
}
