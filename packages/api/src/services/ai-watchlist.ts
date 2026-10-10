import { db } from "@Sentinel360/db";
import { entityMatch, entityProfile, watchlistEntry } from "@Sentinel360/db/schema/entities";
import { and, desc, eq, inArray, ne } from "drizzle-orm";

// Wanted persons/vehicles the apps/ai pipeline matches against: faces
// (watchlist.py, off unless FACE_RECOGNITION_ENABLED) and plates (plates.py,
// off unless ALPR_ENABLED). Same population as profiles.listPublicWanted,
// limited to profiles with a photo or a known plate, and only the fields
// matching needs.
export interface AiWatchlistItem {
  entityProfileId: string;
  displayName: string | null;
  photoUrl: string | null;
  plates: string[];
  priorityLevel: string | null;
}

function readPlates(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim());
}

export async function listAiWatchlist(): Promise<AiWatchlistItem[]> {
  const rows = await db
    .select({
      id: entityProfile.id,
      displayName: entityProfile.displayName,
      photoUrl: entityProfile.primaryFaceImageUrl,
      knownPlateNumbers: entityProfile.knownPlateNumbers,
    })
    .from(entityProfile)
    .where(and(ne(entityProfile.watchlistStatus, "NONE"), eq(entityProfile.status, "ACTIVE")));
  // The wanted list is small, so photo/plate filtering happens here rather
  // than in SQL over the jsonb column.
  const profiles = rows
    .map((row) => ({ ...row, plates: readPlates(row.knownPlateNumbers) }))
    .filter((p) => p.photoUrl || p.plates.length > 0);
  if (profiles.length === 0) return [];

  const entries = await db
    .select({ entityProfileId: watchlistEntry.entityProfileId, priorityLevel: watchlistEntry.priorityLevel })
    .from(watchlistEntry)
    .where(
      and(
        eq(watchlistEntry.status, "ACTIVE"),
        inArray(
          watchlistEntry.entityProfileId,
          profiles.map((p) => p.id),
        ),
      ),
    )
    .orderBy(desc(watchlistEntry.updatedAt));
  // Newest active entry wins, as in profiles.getPublicWantedById.
  const priority = new Map<string, string>();
  for (const entry of entries) {
    if (!priority.has(entry.entityProfileId)) priority.set(entry.entityProfileId, entry.priorityLevel);
  }

  return profiles.map((p) => ({
    entityProfileId: p.id,
    displayName: p.displayName,
    photoUrl: p.photoUrl,
    plates: p.plates,
    priorityLevel: priority.get(p.id) ?? null,
  }));
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AiWatchlistSuggestion {
  entityProfileId: string;
  similarity: number;
}

/** The well-formed entries of an event's metadata.watchlistMatches. */
export function readWatchlistSuggestions(metadata: Record<string, unknown> | undefined): AiWatchlistSuggestion[] {
  const raw = metadata?.watchlistMatches;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { entityProfileId, similarity } = item as Record<string, unknown>;
    if (typeof entityProfileId !== "string" || !UUID_PATTERN.test(entityProfileId)) return [];
    if (typeof similarity !== "number" || !Number.isFinite(similarity) || similarity < -1 || similarity > 1) {
      return [];
    }
    return [{ entityProfileId, similarity }];
  });
}

/**
 * Records the pipeline's face-match suggestions for an incident as
 * entity_match rows (source INCIDENT). These are leads for an officer to
 * verify, not identifications: nothing on the profile itself changes.
 * Failures are logged, never thrown — losing a suggestion must not lose
 * the docket.
 */
export async function recordWatchlistSuggestions(
  incidentId: string,
  metadata: Record<string, unknown> | undefined,
): Promise<number> {
  const suggestions = readWatchlistSuggestions(metadata);
  if (suggestions.length === 0) return 0;
  try {
    await db.insert(entityMatch).values(
      suggestions.map((s) => ({
        entityProfileId: s.entityProfileId,
        sourceEntityType: "INCIDENT",
        sourceEntityId: incidentId,
        similarityScore: s.similarity.toFixed(4),
      })),
    );
    return suggestions.length;
  } catch (error) {
    console.error(`Failed to record watchlist suggestions for incident ${incidentId}`, error);
    return 0;
  }
}
