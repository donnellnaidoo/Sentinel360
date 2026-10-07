import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { leoProcedure, requirePermission, requireRole } from "../index";

type NextFn = (opts: { ctx: unknown }) => unknown;
type MiddlewareFn = (opts: { ctx: unknown; next: NextFn }) => unknown;

function getMiddleware(guard: { _def: { middlewares: unknown[] } }): MiddlewareFn {
  const middleware = guard._def.middlewares[1];
  if (!middleware) {
    throw new Error("Expected guard to have a second middleware");
  }
  return middleware as MiddlewareFn;
}

const next: NextFn = (opts) => opts.ctx;

describe("requireRole logic", () => {
  it("should allow when role matches", () => {
    const middleware = getMiddleware(requireRole("super_admin"));
    const result = middleware({
      ctx: { session: { user: { id: "u1", role: "super_admin", roles: ["super_admin"] } } },
      next,
    });
    expect(result).toBeDefined();
  });

  it("should reject when role does not match", () => {
    const middleware = getMiddleware(requireRole("super_admin"));
    expect(() =>
      middleware({
        ctx: { session: { user: { id: "u1", role: "admin", roles: ["admin"] } } },
        next,
      }),
    ).toThrow(TRPCError);
  });

  it("should allow when the matching role is not the user's first role", () => {
    // Everyone gets "community" on first login; a later admin grant must
    // still pass regardless of the order roles come back from the DB.
    const middleware = getMiddleware(requireRole("admin"));
    const result = middleware({
      ctx: { session: { user: { id: "u1", role: "community", roles: ["community", "admin"] } } },
      next,
    });
    expect(result).toBeDefined();
  });

  it("should allow when one of multiple roles matches", () => {
    const middleware = getMiddleware(requireRole("admin", "super_admin"));
    const result = middleware({
      ctx: { session: { user: { id: "u1", role: "admin", roles: ["admin"] } } },
      next,
    });
    expect(result).toBeDefined();
  });
});

describe("leoProcedure logic", () => {
  const middleware = getMiddleware(leoProcedure);

  it("should allow law_enforcement role", () => {
    const result = middleware({
      ctx: { session: { user: { id: "u1", role: "law_enforcement", roles: ["law_enforcement"] } } },
      next,
    });
    expect(result).toBeDefined();
  });

  it("should allow investigator, security_operator, admin, super_admin roles", () => {
    for (const role of ["investigator", "security_operator", "admin", "super_admin"]) {
      const result = middleware({
        ctx: { session: { user: { id: "u1", role, roles: [role] } } },
        next,
      });
      expect(result).toBeDefined();
    }
  });

  it("should reject community role", () => {
    expect(() =>
      middleware({
        ctx: { session: { user: { id: "u1", role: "community", roles: ["community"] } } },
        next,
      }),
    ).toThrow(TRPCError);
  });
});

describe("requirePermission logic", () => {
  it("should allow when user has permission", () => {
    const middleware = getMiddleware(requirePermission("users:read"));
    const result = middleware({
      ctx: { session: { user: { id: "u1", permissions: ["users:read", "users:write"] } } },
      next,
    });
    expect(result).toBeDefined();
  });

  it("should reject when user lacks permission", () => {
    const middleware = getMiddleware(requirePermission("users:delete"));
    expect(() =>
      middleware({
        ctx: { session: { user: { id: "u1", permissions: ["users:read"] } } },
        next,
      }),
    ).toThrow(TRPCError);
  });

  it("should reject with empty permissions", () => {
    const middleware = getMiddleware(requirePermission("users:read"));
    expect(() =>
      middleware({
        ctx: { session: { user: { id: "u1", permissions: [] } } },
        next,
      }),
    ).toThrow(TRPCError);
  });
});
