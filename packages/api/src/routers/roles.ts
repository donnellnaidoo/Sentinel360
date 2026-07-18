import { db } from "@Sentinel360/db";
import { permission, role, rolePermission, userRole } from "@Sentinel360/db/schema/rbac";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { adminProcedure, router, superAdminProcedure } from "../index";
import {
  assignRoleSchema,
  createRoleSchema,
  idSchema,
  removeRoleSchema,
} from "../validators";
import { z } from "zod";

export const rolesRouter = router({
  list: adminProcedure.query(async () => {
    return await db.select().from(role);
  }),

  create: superAdminProcedure.input(createRoleSchema).mutation(async ({ input }) => {
    const { permissionIds, ...roleData } = input;

    const [created] = await db
      .insert(role)
      .values({ ...roleData, isSystem: false })
      .returning();

    if (created && permissionIds?.length) {
      await db.insert(rolePermission).values(
        permissionIds.map((permissionId) => ({
          roleId: created.id,
          permissionId,
        })),
      );
    }

    return created;
  }),

  getById: adminProcedure.input(idSchema).query(async ({ input }) => {
    const [found] = await db.select().from(role).where(eq(role.id, input.id)).limit(1);
    if (!found) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
    }

    const permissionsResult = await db
      .select({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
      })
      .from(rolePermission)
      .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
      .where(eq(rolePermission.roleId, found.id));

    return { ...found, permissions: permissionsResult };
  }),

  getPermissions: adminProcedure.input(idSchema).query(async ({ input }) => {
    return await db
      .select({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
      })
      .from(rolePermission)
      .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
      .where(eq(rolePermission.roleId, input.id));
  }),

  updatePermissions: superAdminProcedure
    .input(
      z.object({
        roleId: z.string().uuid(),
        permissionIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ input }) => {
      await db.delete(rolePermission).where(eq(rolePermission.roleId, input.roleId));

      if (input.permissionIds.length > 0) {
        await db.insert(rolePermission).values(
          input.permissionIds.map((permissionId) => ({
            roleId: input.roleId,
            permissionId,
          })),
        );
      }
      return { success: true };
    }),

  assignRole: superAdminProcedure.input(assignRoleSchema).mutation(async ({ input }) => {
    const existing = await db
      .select()
      .from(userRole)
      .where(
        and(eq(userRole.userId, input.userId), eq(userRole.roleId, input.roleId)),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User already has this role",
      });
    }

    await db.insert(userRole).values({
      userId: input.userId,
      roleId: input.roleId,
    });

    return { success: true };
  }),

  removeRole: superAdminProcedure.input(removeRoleSchema).mutation(async ({ input }) => {
    await db
      .delete(userRole)
      .where(
        and(eq(userRole.userId, input.userId), eq(userRole.roleId, input.roleId)),
      );

    return { success: true };
  }),

  listPermissions: adminProcedure.query(async () => {
    return await db.select().from(permission);
  }),
});
