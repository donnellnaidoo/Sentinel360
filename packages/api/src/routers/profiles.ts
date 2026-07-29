import { db } from "@Sentinel360/db";
import { entityProfile, watchlistEntry } from "@Sentinel360/db/schema/entities";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, ne, type SQL } from "drizzle-orm";

import { protectedProcedure, requirePermission, router } from "../index";
import {
  addToWatchlistSchema,
  createEntityProfileSchema,
  entityProfileListSchema,
  idSchema,
  updateEntityProfileSchema,
} from "../validators";
import { uploadProfilePhoto } from "../services/entity-photo-storage";

function pushIf<T>(arr: T[], item: T | undefined): void {
  if (item !== undefined) {
    arr.push(item);
  }
}

function readPublicAttributes(attributes: unknown): {
  physicalDescription?: string;
  charges?: string[];
} {
  const attrs = (attributes ?? {}) as Record<string, unknown>;
  return {
    physicalDescription:
      typeof attrs.physicalDescription === "string" ? attrs.physicalDescription : undefined,
    charges: Array.isArray(attrs.charges)
      ? attrs.charges.filter((c): c is string => typeof c === "string")
      : undefined,
  };
}

async function getProfileOrThrow(id: string) {
  const [found] = await db
    .select()
    .from(entityProfile)
    .where(eq(entityProfile.id, id))
    .limit(1);
  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
  }
  return found;
}

export const profilesRouter = router({
  list: requirePermission("profiles:read")
    .input(entityProfileListSchema)
    .query(async ({ input }) => {
      const conditions: SQL[] = [];
      pushIf(
        conditions,
        input.search ? ilike(entityProfile.displayName, `%${input.search}%`) : undefined,
      );
      pushIf(
        conditions,
        input.entityType ? eq(entityProfile.entityType, input.entityType) : undefined,
      );
      pushIf(
        conditions,
        input.watchlistStatus
          ? eq(entityProfile.watchlistStatus, input.watchlistStatus)
          : undefined,
      );
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: count() })
        .from(entityProfile)
        .where(where);
      const items = await db
        .select()
        .from(entityProfile)
        .where(where)
        .orderBy(desc(entityProfile.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items,
        total: totalResult?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  getById: requirePermission("profiles:read").input(idSchema).query(async ({ input }) => {
    return getProfileOrThrow(input.id);
  }),

  // Public-safe wanted feed for any authenticated user (incl. community) —
  // deliberately not gated by profiles:read. The raw `attributes` blob can
  // hold arbitrary internal metadata, so only the two keys meant for public
  // consumption (physicalDescription, charges) are ever surfaced here.
  listPublicWanted: protectedProcedure.query(async () => {
    const rows = await db
      .select({
        id: entityProfile.id,
        entityType: entityProfile.entityType,
        displayName: entityProfile.displayName,
        primaryFaceImageUrl: entityProfile.primaryFaceImageUrl,
        watchlistStatus: entityProfile.watchlistStatus,
        lastSeenAt: entityProfile.lastSeenAt,
        attributes: entityProfile.attributes,
      })
      .from(entityProfile)
      .where(ne(entityProfile.watchlistStatus, "NONE"))
      .orderBy(desc(entityProfile.updatedAt));

    return rows.map(({ attributes, ...rest }) => ({
      ...rest,
      ...readPublicAttributes(attributes),
    }));
  }),

  // Only the manually-entered fields are writable here. primaryFaceEmbedding,
  // detectionCount, locationsSeen etc. are populated by the AI/CCTV pipeline
  // (deferred) and are intentionally not exposed on this schema.
  // physicalDescription/charges have no dedicated column — they're folded
  // into `attributes` — and photo, if provided, is uploaded to public
  // storage and its resulting URL stored as primaryFaceImageUrl.
  create: requirePermission("profiles:create")
    .input(createEntityProfileSchema)
    .mutation(async ({ input }) => {
      const { photo, physicalDescription, charges, attributes, ...rest } = input;

      let primaryFaceImageUrl: string | undefined;
      if (photo) {
        const fileBytes = Buffer.from(photo.fileBase64, "base64");
        const uploaded = await uploadProfilePhoto(fileBytes, photo.originalFilename, photo.mimeType);
        primaryFaceImageUrl = uploaded.publicUrl;
      }

      const [created] = await db
        .insert(entityProfile)
        .values({
          ...rest,
          primaryFaceImageUrl,
          attributes: {
            ...(attributes ?? {}),
            ...(physicalDescription !== undefined ? { physicalDescription } : {}),
            ...(charges !== undefined ? { charges } : {}),
          },
        })
        .returning();
      return created;
    }),

  update: requirePermission("profiles:update")
    .input(updateEntityProfileSchema)
    .mutation(async ({ input }) => {
      const { id, photo, physicalDescription, charges, attributes, ...rest } = input;
      const existing = await getProfileOrThrow(id);

      let primaryFaceImageUrl: string | undefined;
      if (photo) {
        const fileBytes = Buffer.from(photo.fileBase64, "base64");
        const uploaded = await uploadProfilePhoto(fileBytes, photo.originalFilename, photo.mimeType);
        primaryFaceImageUrl = uploaded.publicUrl;
      }

      const touchesAttributes =
        attributes !== undefined || physicalDescription !== undefined || charges !== undefined;

      const [updated] = await db
        .update(entityProfile)
        .set({
          ...rest,
          ...(primaryFaceImageUrl !== undefined ? { primaryFaceImageUrl } : {}),
          ...(touchesAttributes
            ? {
                attributes: {
                  ...(attributes ?? (existing.attributes as Record<string, unknown>) ?? {}),
                  ...(physicalDescription !== undefined ? { physicalDescription } : {}),
                  ...(charges !== undefined ? { charges } : {}),
                },
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(entityProfile.id, id))
        .returning();
      return updated;
    }),

  // --- Watchlist ---

  listWatchlist: requirePermission("watchlist:read").query(async () => {
    return db
      .select()
      .from(watchlistEntry)
      .where(eq(watchlistEntry.status, "ACTIVE"))
      .orderBy(desc(watchlistEntry.createdAt));
  }),

  addToWatchlist: requirePermission("watchlist:create")
    .input(addToWatchlistSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await getProfileOrThrow(input.entityProfileId);

      const [entry] = await db
        .insert(watchlistEntry)
        .values({
          entityProfileId: input.entityProfileId,
          priorityLevel: input.priorityLevel,
          reason: input.reason,
          caseId: input.caseId,
          expiryDate: input.expiryDate,
          createdByUserId: ctx.session.user.id,
        })
        .returning();

      await db
        .update(entityProfile)
        .set({ watchlistStatus: input.priorityLevel, updatedAt: new Date() })
        .where(eq(entityProfile.id, profile.id));

      return entry;
    }),

  removeFromWatchlist: requirePermission("watchlist:update")
    .input(idSchema)
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(watchlistEntry)
        .set({ status: "REMOVED", updatedAt: new Date() })
        .where(eq(watchlistEntry.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Watchlist entry not found" });
      }

      await db
        .update(entityProfile)
        .set({ watchlistStatus: "NONE", updatedAt: new Date() })
        .where(eq(entityProfile.id, updated.entityProfileId));

      return updated;
    }),
});
