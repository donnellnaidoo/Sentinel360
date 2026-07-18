import { db } from "@Sentinel360/db";
import { investigationCase } from "@Sentinel360/db/schema/cases";
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
 * Generates the next S360-<year>-NNNNN case number and inserts the case in
 * one attempt, retrying on a unique-constraint race (concurrent creates in
 * the same year) rather than relying on a DB sequence.
 */
export async function insertCaseWithGeneratedNumber(
  values: Omit<typeof investigationCase.$inferInsert, "caseNumber">,
  maxAttempts = 5,
): Promise<typeof investigationCase.$inferSelect> {
  const year = new Date().getFullYear();
  const prefix = `S360-${year}-`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const [existingResult] = await db
      .select({ count: count() })
      .from(investigationCase)
      .where(like(investigationCase.caseNumber, `${prefix}%`));

    const sequence = (existingResult?.count ?? 0) + 1 + attempt;
    const caseNumber = `${prefix}${String(sequence).padStart(5, "0")}`;

    try {
      const [created] = await db
        .insert(investigationCase)
        .values({ ...values, caseNumber })
        .returning();
      if (!created) {
        throw new Error("Case insert returned no row");
      }
      return created;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < maxAttempts - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to generate a unique case number after retries");
}
