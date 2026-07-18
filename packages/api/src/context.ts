import { supabaseAdmin } from "@Sentinel360/auth";
import { db } from "@Sentinel360/db";
import { user } from "@Sentinel360/db/schema/auth";
import { permission, role, rolePermission, userRole } from "@Sentinel360/db/schema/rbac";
import type { Context as HonoContext } from "hono";
import { eq, inArray } from "drizzle-orm";

export type CreateContextOptions = {
  context: HonoContext;
};

export interface EnrichedUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  role: string;
  roles: string[];
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EnrichedSession {
  user: EnrichedUser;
}

export async function createContext({ context }: CreateContextOptions) {
  const authHeader = context.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  let enrichedSession: EnrichedSession | null = null;

  if (token) {
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (!error && supabaseUser) {
      // Upsert profile row on first access. popiaConsentAt is sourced from
      // Supabase user_metadata (set at sign-up time) so consent recorded
      // against the auth user is mirrored into our queryable profile table.
      const consentAtRaw = supabaseUser.user_metadata?.popiaConsentAt;
      const popiaConsentAt =
        typeof consentAtRaw === "string" && !Number.isNaN(Date.parse(consentAtRaw))
          ? new Date(consentAtRaw)
          : null;

      await db
        .insert(user)
        .values({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name:
            supabaseUser.user_metadata?.name ??
            supabaseUser.user_metadata?.full_name ??
            supabaseUser.email!.split("@")[0],
          emailVerified: !!supabaseUser.email_confirmed_at,
          popiaConsentAt,
          createdAt: new Date(supabaseUser.created_at),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      const userRoles = await db
        .select({ roleCode: role.code })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .where(eq(userRole.userId, supabaseUser.id));

      const roleIds = (
        await db
          .select({ id: userRole.roleId })
          .from(userRole)
          .where(eq(userRole.userId, supabaseUser.id))
      ).map((r) => r.id);

      const permissionsResult =
        roleIds.length > 0
          ? await db
              .select({ code: permission.code })
              .from(rolePermission)
              .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
              .where(inArray(rolePermission.roleId, roleIds))
          : [];

      const permCodes = [...new Set(permissionsResult.map((p) => p.code))];
      const roleCodes = userRoles.map((r) => r.roleCode);

      // Fall back to app_metadata role if no RBAC roles assigned yet
      const appMetaRole: string = supabaseUser.app_metadata?.role ?? "community";

      enrichedSession = {
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          emailVerified: !!supabaseUser.email_confirmed_at,
          name:
            supabaseUser.user_metadata?.name ??
            supabaseUser.user_metadata?.full_name ??
            supabaseUser.email!.split("@")[0],
          image: supabaseUser.user_metadata?.avatar_url ?? null,
          role: roleCodes[0] ?? appMetaRole,
          roles: roleCodes.length > 0 ? roleCodes : [appMetaRole],
          permissions: permCodes,
          createdAt: new Date(supabaseUser.created_at),
          updatedAt: new Date(),
        },
      };
    }
  }

  return {
    session: enrichedSession,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
