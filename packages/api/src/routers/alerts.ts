import { db } from "@Sentinel360/db";
import { alert, alertAcknowledgment, notification } from "@Sentinel360/db/schema/alerts";
import { user } from "@Sentinel360/db/schema/auth";
import { role, userRole } from "@Sentinel360/db/schema/rbac";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, getTableColumns, gt, inArray, isNull, or, sql } from "drizzle-orm";

import { protectedProcedure, requirePermission, router } from "../index";
import { acknowledgeAlertSchema, alertListSchema, createAlertSchema } from "../validators";
import { recordAuditEvent } from "../services/audit-log";

// alert has no target-role column — recipiency is realized as explicit
// notification rows written at creation time (see `create` below), not a
// role filter evaluated at read time. This resolves the requested
// targetRole into the concrete set of recipient user ids.
async function resolveTargetUserIds(targetRole: string): Promise<string[]> {
  if (targetRole === "ALL") {
    const rows = await db.select({ id: user.id }).from(user);
    return rows.map((r) => r.id);
  }

  const roleCodes: Record<string, string[]> = {
    COMMUNITY: ["community"],
    SECURITY_OPERATOR: ["security_operator"],
    LAW_ENFORCEMENT: ["law_enforcement"],
    ADMIN: ["admin", "super_admin"],
  };
  const codes = roleCodes[targetRole] ?? [];
  if (codes.length === 0) return [];

  const rows = await db
    .select({ id: user.id })
    .from(user)
    .innerJoin(userRole, eq(userRole.userId, user.id))
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(inArray(role.code, codes));

  return [...new Set(rows.map((r) => r.id))];
}

async function getAlertOrThrow(id: string) {
  const [found] = await db.select().from(alert).where(eq(alert.id, id)).limit(1);
  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
  }
  return found;
}

function withPublicShape(row: typeof alert.$inferSelect) {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    ...row,
    description: row.message,
    targetRole: (metadata.targetRole as string | undefined) ?? "ALL",
  };
}

export const alertsRouter = router({
  // Community inbox = personal notification fan-out PLUS active COMMUNITY/ALL
  // broadcasts (so mobile users see admin-created alerts even if they joined
  // after the fan-out ran, or if role assignment lagged behind signup).
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const userId = ctx.session.user.id;

    const personalRows = await db
      .select({
        ...getTableColumns(alert),
        acknowledgedAt: alertAcknowledgment.acknowledgedAt,
      })
      .from(notification)
      .innerJoin(alert, eq(notification.alertId, alert.id))
      .leftJoin(
        alertAcknowledgment,
        and(
          eq(alertAcknowledgment.alertId, alert.id),
          eq(alertAcknowledgment.userId, userId),
        ),
      )
      .where(
        and(
          eq(notification.recipientUserId, userId),
          or(isNull(alert.expiresAt), gt(alert.expiresAt, now)),
        ),
      )
      .orderBy(desc(alert.createdAt));

    const broadcastRows = await db
      .select({
        ...getTableColumns(alert),
        acknowledgedAt: alertAcknowledgment.acknowledgedAt,
      })
      .from(alert)
      .leftJoin(
        alertAcknowledgment,
        and(
          eq(alertAcknowledgment.alertId, alert.id),
          eq(alertAcknowledgment.userId, userId),
        ),
      )
      .where(
        and(
          eq(alert.status, "ACTIVE"),
          or(isNull(alert.expiresAt), gt(alert.expiresAt, now)),
          sql`(${alert.metadata}->>'targetRole') IN ('COMMUNITY', 'ALL')`,
        ),
      )
      .orderBy(desc(alert.createdAt));

    const byId = new Map<string, (typeof personalRows)[number]>();
    for (const row of [...personalRows, ...broadcastRows]) {
      const existing = byId.get(row.id);
      if (!existing || (!existing.acknowledgedAt && row.acknowledgedAt)) {
        byId.set(row.id, row);
      }
    }

    return [...byId.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({ ...withPublicShape(r), acknowledgedAt: r.acknowledgedAt }));
  }),

  list: requirePermission("alerts:read")
    .input(alertListSchema)
    .query(async ({ input }) => {
      const where = input.severity ? eq(alert.severity, input.severity) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(alert).where(where);
      const items = await db
        .select()
        .from(alert)
        .where(where)
        .orderBy(desc(alert.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items: items.map(withPublicShape),
        total: totalResult?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  create: requirePermission("alerts:manage")
    .input(createAlertSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(alert)
        .values({
          title: input.title,
          message: input.description ?? input.title,
          alertType: input.alertType,
          severity: input.severity,
          sourceDomain: "MANUAL",
          expiresAt: input.expiresAt,
          location: input.location ?? {},
          metadata: { targetRole: input.targetRole, createdByUserId: ctx.session.user.id },
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Alert was not created" });
      }

      const recipientIds = await resolveTargetUserIds(input.targetRole);
      if (recipientIds.length > 0) {
        const deliveredAt = new Date();
        await db.insert(notification).values(
          recipientIds.map((recipientUserId) => ({
            alertId: created.id,
            recipientUserId,
            channel: "IN_APP",
            title: created.title,
            body: created.message,
            deliveryStatus: "DELIVERED",
            sentAt: deliveredAt,
            deliveredAt,
          })),
        );
      }

      await recordAuditEvent({
        eventType: "alert.created",
        domain: "ALERTS",
        actorId: ctx.session.user.id,
        targetEntityType: "ALERT",
        targetEntityId: created.id,
        action: "CREATE",
        payload: { title: created.title, severity: created.severity, recipients: recipientIds.length },
      });

      return withPublicShape(created);
    }),

  acknowledge: protectedProcedure
    .input(acknowledgeAlertSchema)
    .mutation(async ({ ctx, input }) => {
      await getAlertOrThrow(input.alertId);

      const [existing] = await db
        .select({ id: alertAcknowledgment.id })
        .from(alertAcknowledgment)
        .where(
          and(
            eq(alertAcknowledgment.alertId, input.alertId),
            eq(alertAcknowledgment.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!existing) {
        await db.insert(alertAcknowledgment).values({
          alertId: input.alertId,
          userId: ctx.session.user.id,
          channel: "IN_APP",
        });
      }

      await db
        .update(notification)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notification.alertId, input.alertId),
            eq(notification.recipientUserId, ctx.session.user.id),
            isNull(notification.readAt),
          ),
        );

      await recordAuditEvent({
        eventType: "alert.acknowledged",
        domain: "ALERTS",
        actorId: ctx.session.user.id,
        targetEntityType: "ALERT",
        targetEntityId: input.alertId,
        action: "UPDATE",
      });

      return { success: true };
    }),
});
