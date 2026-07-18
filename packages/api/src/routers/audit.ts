import { db } from "@Sentinel360/db";
import { auditLog } from "@Sentinel360/db/schema/audit";
import { user } from "@Sentinel360/db/schema/auth";
import { and, count, desc, eq, getTableColumns, type SQL } from "drizzle-orm";

import { requirePermission, router } from "../index";
import { auditListSchema } from "../validators";

function pushIf<T>(arr: T[], item: T | undefined): void {
  if (item !== undefined) {
    arr.push(item);
  }
}

export const auditRouter = router({
  list: requirePermission("audit:read")
    .input(auditListSchema)
    .query(async ({ input }) => {
      const conditions: SQL[] = [];
      pushIf(conditions, input.domain ? eq(auditLog.domain, input.domain) : undefined);
      pushIf(conditions, input.eventType ? eq(auditLog.eventType, input.eventType) : undefined);
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(auditLog).where(where);
      const items = await db
        .select({
          ...getTableColumns(auditLog),
          actorName: user.name,
        })
        .from(auditLog)
        .leftJoin(user, eq(auditLog.actorId, user.id))
        .where(where)
        .orderBy(desc(auditLog.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items,
        total: totalResult?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),
});
