import { supabaseAdmin } from "@Sentinel360/auth";
import { db } from "@Sentinel360/db";
import { user } from "@Sentinel360/db/schema/auth";
import { permission, role, rolePermission, userRole } from "@Sentinel360/db/schema/rbac";
import type { Context as HonoContext } from "hono";
import { and, eq, inArray, isNull } from "drizzle-orm";

export type CreateContextOptions = {
  context: HonoContext;
};

export interface EnrichedUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role: string;
  roles: string[];
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EnrichedSession {
  user: EnrichedUser;
}

function metaString(meta: Record<string, unknown> | undefined, ...keys: string[]): string | null {
  if (!meta) return null;
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function splitName(fullName: string): { firstName: string | null; lastName: string | null } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: null };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export async function createContext({ context }: CreateContextOptions) {
  const authHeader = context.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const clientIp =
    context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    context.req.header("x-real-ip") ||
    null;

  let enrichedSession: EnrichedSession | null = null;

  if (token) {
    const {
      data: { user: supabaseUser },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (!error && supabaseUser?.email) {
      const meta = (supabaseUser.user_metadata ?? {}) as Record<string, unknown>;

      const consentAtRaw = meta.popiaConsentAt;
      const popiaConsentAt =
        typeof consentAtRaw === "string" && !Number.isNaN(Date.parse(consentAtRaw))
          ? new Date(consentAtRaw)
          : null;

      const displayName =
        metaString(meta, "name", "full_name") ?? supabaseUser.email.split("@")[0]!;
      const fromName = splitName(displayName);
      const firstName = metaString(meta, "first_name", "firstName") ?? fromName.firstName;
      const lastName = metaString(meta, "last_name", "lastName") ?? fromName.lastName;
      const phoneNumber = metaString(meta, "phone_number", "phoneNumber", "phone");
      const image = metaString(meta, "avatar_url", "image", "picture");

      await db
        .insert(user)
        .values({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: displayName,
          emailVerified: !!supabaseUser.email_confirmed_at,
          image,
          firstName,
          lastName,
          phoneNumber,
          popiaConsentAt,
          isActive: true,
          isLocked: false,
          failedLoginAttempts: 0,
          lastLoginAt: new Date(),
          lastLoginIp: clientIp,
          createdAt: new Date(supabaseUser.created_at),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      const [profile] = await db
        .select()
        .from(user)
        .where(and(eq(user.id, supabaseUser.id), isNull(user.deletedAt)))
        .limit(1);

      if (!profile || !profile.isActive || profile.isLocked) {
        return { session: null };
      }

      const loginStale =
        !profile.lastLoginAt || Date.now() - profile.lastLoginAt.getTime() > 15 * 60 * 1000;

      if (loginStale || profile.emailVerified !== !!supabaseUser.email_confirmed_at) {
        await db
          .update(user)
          .set({
            emailVerified: !!supabaseUser.email_confirmed_at,
            ...(loginStale
              ? {
                  lastLoginAt: new Date(),
                  lastLoginIp: clientIp,
                  failedLoginAttempts: 0,
                }
              : {}),
            updatedAt: new Date(),
            ...(image && !profile.image ? { image } : {}),
          })
          .where(eq(user.id, supabaseUser.id));
      }

      // Ensure community members get the community RBAC role on first login.
      const existingRoles = await db
        .select({ roleId: userRole.roleId, roleCode: role.code })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .where(eq(userRole.userId, supabaseUser.id));

      if (existingRoles.length === 0) {
        const [communityRole] = await db
          .select({ id: role.id })
          .from(role)
          .where(eq(role.code, "community"))
          .limit(1);

        if (communityRole) {
          await db
            .insert(userRole)
            .values({ userId: supabaseUser.id, roleId: communityRole.id })
            .onConflictDoNothing();
        }
      }

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
      const appMetaRole: string = supabaseUser.app_metadata?.role ?? "community";

      enrichedSession = {
        user: {
          id: profile.id,
          email: profile.email,
          emailVerified: profile.emailVerified,
          name: profile.name,
          image: profile.image,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phoneNumber: profile.phoneNumber,
          role: roleCodes[0] ?? appMetaRole,
          roles: roleCodes.length > 0 ? roleCodes : [appMetaRole],
          permissions: permCodes,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      };
    }
  }

  return {
    session: enrichedSession,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
