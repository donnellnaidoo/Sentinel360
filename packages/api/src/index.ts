import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export function requireRole(...roles: string[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    const userRole = ctx.session?.user.role;
    if (!userRole || !roles.includes(userRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Requires one of roles: ${roles.join(", ")}`,
      });
    }
    return next({ ctx });
  });
}

export function requirePermission(permission: string) {
  return protectedProcedure.use(({ ctx, next }) => {
    const permissions = ctx.session?.user.permissions ?? [];
    if (!permissions.includes(permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Missing required permission: ${permission}`,
      });
    }
    return next({ ctx });
  });
}

export const adminProcedure = requireRole("admin", "super_admin");
export const superAdminProcedure = requireRole("super_admin");

// Any internal operational role — excludes "community" (public/mobile app
// users). Use as a coarse gate for investigation-domain reads; use
// requirePermission(...) for create/update/delete so access follows the
// seeded role_permission grants exactly (e.g. law_enforcement is read-only).
export const leoProcedure = requireRole(
  "law_enforcement",
  "investigator",
  "security_operator",
  "admin",
  "super_admin",
);
