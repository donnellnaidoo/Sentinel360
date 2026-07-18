import { db } from "@Sentinel360/db";
import { communitySighting } from "@Sentinel360/db/schema/sightings";
import { count, like } from "drizzle-orm";

const POSTGRES_UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
  );
}

/**
 * Generates the next ST-<year>-NNNNN reference code and inserts the sighting
 * in one attempt, retrying on a unique-constraint race (mirrors
 * insertCaseWithGeneratedNumber in services/case-number.ts).
 */
export async function insertSightingWithGeneratedNumber(
  values: Omit<typeof communitySighting.$inferInsert, "referenceCode">,
  maxAttempts = 5,
): Promise<typeof communitySighting.$inferSelect> {
  const year = new Date().getFullYear();
  const prefix = `ST-${year}-`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const [existingResult] = await db
      .select({ count: count() })
      .from(communitySighting)
      .where(like(communitySighting.referenceCode, `${prefix}%`));

    const sequence = (existingResult?.count ?? 0) + 1 + attempt;
    const referenceCode = `${prefix}${String(sequence).padStart(5, "0")}`;

    try {
      const [created] = await db
        .insert(communitySighting)
        .values({ ...values, referenceCode })
        .returning();
      if (!created) {
        throw new Error("Sighting insert returned no row");
      }
      return created;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < maxAttempts - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to generate a unique sighting reference code after retries");
}
