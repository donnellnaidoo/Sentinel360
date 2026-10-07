import { db } from "@Sentinel360/db";
import { investigationCase } from "@Sentinel360/db/schema/cases";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

type CaseRow = typeof investigationCase.$inferSelect;
export type ViewerCtx = { session: { user: { id: string; roles: string[] } } };

export const PRIVILEGED_ROLES = ["admin", "super_admin"];

/**
 * POPIA condition 6: a case flagged is_sensitive is only visible to its
 * assigned investigator and admin/super_admin. Pure so callers can also ask
 * "would this user still see the case after a change?".
 */
export function canViewSensitiveCase(
  caseRow: Pick<CaseRow, "assignedToUserId">,
  ctx: ViewerCtx,
): boolean {
  const { id, roles } = ctx.session.user;
  return caseRow.assignedToUserId === id || roles.some((r) => PRIVILEGED_ROLES.includes(r));
}

// Everyone else gets a 403, not a filtered/redacted view. Every case read
// path (including sub-resources and evidence uploads into a case) routes
// through getCaseOrThrow so the restriction can't be bypassed.
function assertCaseVisible(caseRow: CaseRow, ctx: ViewerCtx): void {
  if (caseRow.isSensitive && !canViewSensitiveCase(caseRow, ctx)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This case is restricted to its assigned investigator and administrators",
    });
  }
}

export async function getCaseOrThrow(id: string, ctx: ViewerCtx) {
  const [found] = await db
    .select()
    .from(investigationCase)
    .where(eq(investigationCase.id, id))
    .limit(1);

  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
  }
  assertCaseVisible(found, ctx);
  return found;
}
