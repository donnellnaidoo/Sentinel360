import { createAdminClient } from "@/lib/supabase/admin";

// Roles live in the RBAC tables (user_role -> role), the same source the
// tRPC context uses — never in Supabase app_metadata, which nothing writes.
export const CONSOLE_ROLES = ["super_admin", "admin"] as const;
export type ConsoleRole = (typeof CONSOLE_ROLES)[number];

type UserRoleRow = {
  is_active: boolean;
  is_locked: boolean;
  deleted_at: string | null;
  user_role: Array<{ role: { code: string } | null }> | null;
};

/**
 * Resolves the highest admin-console role a user holds, or null when they
 * may not use the console at all (no admin role, deactivated, locked,
 * deleted, or never provisioned). Callers must treat null as "deny".
 */
export async function getConsoleRole(userId: string): Promise<ConsoleRole | null> {
  const { data, error } = await createAdminClient()
    .from("user")
    .select("is_active, is_locked, deleted_at, user_role(role(code))")
    .eq("id", userId)
    .maybeSingle<UserRoleRow>();

  if (error || !data) return null;
  if (!data.is_active || data.is_locked || data.deleted_at) return null;

  const codes = new Set((data.user_role ?? []).map((ur) => ur.role?.code));
  return CONSOLE_ROLES.find((r) => codes.has(r)) ?? null;
}
