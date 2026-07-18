import { db } from "@Sentinel360/db";
import { organization } from "@Sentinel360/db/schema/rbac";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";

import { adminProcedure, router, superAdminProcedure } from "../index";
import {
  createOrganizationSchema,
  idSchema,
  updateOrganizationSchema,
} from "../validators";

export const organizationsRouter = router({
  list: adminProcedure.query(async () => {
    return await db
      .select()
      .from(organization)
      .where(isNull(organization.deletedAt))
      .orderBy(asc(organization.name));
  }),

  getById: adminProcedure.input(idSchema).query(async ({ input }) => {
    const [found] = await db
      .select()
      .from(organization)
      .where(and(eq(organization.id, input.id), isNull(organization.deletedAt)))
      .limit(1);

    if (!found) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    }
    return found;
  }),

  create: superAdminProcedure.input(createOrganizationSchema).mutation(async ({ input }) => {
    const [created] = await db.insert(organization).values(input).returning();
    return created;
  }),

  update: superAdminProcedure.input(updateOrganizationSchema).mutation(async ({ input }) => {
    const { id, ...updateData } = input;
    const [updated] = await db
      .update(organization)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(organization.id, id))
      .returning();

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    }
    return updated;
  }),

  deactivate: superAdminProcedure.input(idSchema).mutation(async ({ input }) => {
    const [updated] = await db
      .update(organization)
      .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(organization.id, input.id))
      .returning();

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    }
    return updated;
  }),
});
