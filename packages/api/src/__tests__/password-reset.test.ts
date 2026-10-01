import { describe, expect, it } from "vitest";

import {
  generateResetCode,
  hashResetCode,
  hashesMatch,
  normalizeEmail,
  parseResetPayload,
  resetIdentifier,
  serializeResetPayload,
} from "../services/password-reset";

describe("password reset helpers", () => {
  it("normalizes email and builds a namespaced identifier", () => {
    expect(normalizeEmail("  Test@Example.COM ")).toBe("test@example.com");
    expect(resetIdentifier("  Test@Example.COM ")).toBe("password_reset:test@example.com");
  });

  it("generates a 6-digit numeric code", () => {
    const code = generateResetCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("hashes codes and compares them in a length-safe way", () => {
    const hash = hashResetCode("123456");
    expect(hashesMatch(hash, hashResetCode("123456"))).toBe(true);
    expect(hashesMatch(hash, hashResetCode("000000"))).toBe(false);
    expect(hashesMatch(hash, "abc")).toBe(false);
  });

  it("round-trips stored reset payloads", () => {
    const serialized = serializeResetPayload({ hash: "abc", attempts: 2 });
    expect(parseResetPayload(serialized)).toEqual({ hash: "abc", attempts: 2 });
    expect(parseResetPayload("not-json")).toBeNull();
  });
});
