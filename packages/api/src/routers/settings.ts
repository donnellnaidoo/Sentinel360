import { db } from "@Sentinel360/db";
import { featureFlag, systemSetting } from "@Sentinel360/db/schema/settings";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";

import { adminProcedure, router, superAdminProcedure } from "../index";
import {
  createFeatureFlagSchema,
  idSchema,
  toggleFeatureFlagSchema,
  upsertSystemSettingSchema,
} from "../validators";

export const settingsRouter = router({
  listSettings: adminProcedure.query(async () => {
    return db.select().from(systemSetting).orderBy(asc(systemSetting.settingKey));
  }),

  upsertSetting: superAdminProcedure
    .input(upsertSystemSettingSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(systemSetting)
        .values({
          settingKey: input.settingKey,
          settingValue: input.settingValue ?? {},
          settingType: input.settingType,
          lastModifiedByUserId: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: systemSetting.settingKey,
          set: {
            settingValue: input.settingValue ?? {},
            settingType: input.settingType,
            lastModifiedByUserId: ctx.session.user.id,
            updatedAt: new Date(),
          },
        })
        .returning();
      return row;
    }),

  deleteSetting: superAdminProcedure.input(idSchema).mutation(async ({ input }) => {
    await db.delete(systemSetting).where(eq(systemSetting.id, input.id));
    return { success: true };
  }),

  listFeatureFlags: adminProcedure.query(async () => {
    return db.select().from(featureFlag).orderBy(asc(featureFlag.name));
  }),

  createFeatureFlag: superAdminProcedure
    .input(createFeatureFlagSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(featureFlag)
        .values({
          name: input.name,
          description: input.description,
          isEnabled: input.isEnabled,
          rolloutPercentage:
            input.rolloutPercentage !== undefined ? String(input.rolloutPercentage) : undefined,
          updatedByUserId: ctx.session.user.id,
        })
        .returning();
      return created;
    }),

  toggleFeatureFlag: superAdminProcedure
    .input(toggleFeatureFlagSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(featureFlag)
        .set({ isEnabled: input.isEnabled, updatedByUserId: ctx.session.user.id, updatedAt: new Date() })
        .where(eq(featureFlag.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature flag not found" });
      }
      return updated;
    }),
});
