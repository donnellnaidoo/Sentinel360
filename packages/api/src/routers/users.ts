import { supabaseAdmin } from "@Sentinel360/auth";
import { db } from "@Sentinel360/db";
import { user } from "@Sentinel360/db/schema/auth";
import { role, userRole } from "@Sentinel360/db/schema/rbac";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, ilike, isNull, or, type SQL } from "drizzle-orm";

import { adminProcedure, protectedProcedure, router, superAdminProcedure } from "../index";
import {
  createUserSchema,
  idSchema,
  updateProfileSchema,
  updateUserSchema,
  userListSchema,
} from "../validators";

function pushIf<T>(arr: T[], item: T | undefined): void {
  if (item !== undefined) {
    arr.push(item);
  }
}

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [found] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, userId), isNull(user.deletedAt)))
      .limit(1);

    if (!found) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    return found;
  }),

  updateMe: protectedProcedure.input(updateProfileSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const [updated] = await db
      .update(user)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();
    return updated;
  }),

  list: adminProcedure.input(userListSchema).query(async ({ input }) => {
    const conditions: SQL[] = [isNull(user.deletedAt)];

    pushIf(
      conditions,
      input.search
        ? or(
            ilike(user.name, `%${input.search}%`),
            ilike(user.email, `%${input.search}%`),
          )
        : undefined,
    );

    if (input.status === "active") {
      conditions.push(eq(user.isActive, true));
    } else if (input.status === "inactive") {
      conditions.push(eq(user.isActive, false));
    } else if (input.status === "locked") {
      conditions.push(eq(user.isLocked, true));
    }

    if (input.organizationId) {
      conditions.push(eq(user.organizationId, input.organizationId));
    }

    const where = and(...conditions);

    const [totalResult] = await db.select({ count: count() }).from(user).where(where);
    const items = await db
      .select()
      .from(user)
      .where(where)
      .orderBy(asc(user.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return {
      items,
      total: totalResult?.count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  }),

  getById: adminProcedure.input(idSchema).query(async ({ input }) => {
    const [found] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, input.id), isNull(user.deletedAt)))
      .limit(1);

    if (!found) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const roles = await db
      .select({ id: role.id, code: role.code, name: role.name })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.userId, found.id));

    return { ...found, roles };
  }),

  create: superAdminProcedure.input(createUserSchema).mutation(async ({ input }) => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name },
    });

    if (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }

    const [profile] = await db
      .insert(user)
      .values({
        id: data.user.id,
        email: input.email,
        name: input.name,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        emailVerified: true,
        organizationId: input.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (input.roleIds?.length) {
      await db.insert(userRole).values(
        input.roleIds.map((roleId) => ({
          userId: data.user.id,
          roleId,
        })),
      );
    }

    return profile ?? { id: data.user.id, email: input.email, name: input.name };
  }),

  update: superAdminProcedure.input(updateUserSchema).mutation(async ({ input }) => {
    const { id, roleIds, ...updateData } = input;

    const [existing] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, id), isNull(user.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    if (Object.keys(updateData).length > 0) {
      await db
        .update(user)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(user.id, id));
    }

    if (roleIds !== undefined) {
      await db.delete(userRole).where(eq(userRole.userId, id));
      if (roleIds.length > 0) {
        await db.insert(userRole).values(
          roleIds.map((roleId) => ({ userId: id, roleId })),
        );
      }
    }

    const [updated] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    return updated;
  }),

  deactivate: superAdminProcedure.input(idSchema).mutation(async ({ input }) => {
    const [updated] = await db
      .update(user)
      .set({ isActive: false, updatedAt: new Date(), deletedAt: new Date() })
      .where(eq(user.id, input.id))
      .returning();

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Also ban in Supabase so the user cannot log in
    await supabaseAdmin.auth.admin.updateUserById(input.id, {
      ban_duration: "876600h", // 100 years
    });

    return updated;
  }),
});
