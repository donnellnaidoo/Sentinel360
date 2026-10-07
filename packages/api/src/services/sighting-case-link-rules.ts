import type { communitySighting } from "@Sentinel360/db/schema/sightings";

type SightingRow = typeof communitySighting.$inferSelect;

// Cases in these statuses aren't offered as suggestions — a fresh sighting
// belongs on a live investigation. A moderator can still pick one manually.
const INACTIVE_CASE_STATUSES = new Set(["CLOSED", "ARCHIVED"]);

/**
 * Orders and de-duplicates the cases a wanted person is tied to: watchlist
 * cases first (the case the person is actively wanted for), then any case
 * they're linked to as a suspect/person of interest. Closed/archived cases
 * are dropped. Pure — no DB access — so the ordering is unit-testable.
 */
export function mergeSuggestedCaseIds(
  watchlistCaseIds: Array<string | null>,
  criminalCaseIds: string[],
  caseStatusById: Map<string, string>,
): string[] {
  const ordered = [...watchlistCaseIds, ...criminalCaseIds].filter(
    (id): id is string => typeof id === "string",
  );
  const result: string[] = [];
  for (const id of ordered) {
    const status = caseStatusById.get(id);
    if (status === undefined || INACTIVE_CASE_STATUSES.has(status)) continue;
    if (!result.includes(id)) result.push(id);
  }
  return result;
}

/**
 * What a community user may see of a sighting. Case suggestions, the linked
 * incident and the duplicate pointer are internal investigation data and
 * must never reach the community app.
 */
export function toCommunitySightingView(row: SightingRow) {
  const {
    suggestedCaseIds: _suggestedCaseIds,
    linkedIncidentId: _linkedIncidentId,
    duplicateOfSightingId: _duplicateOfSightingId,
    operatorNotes: _operatorNotes,
    ...rest
  } = row;
  return rest;
}

export function readSuggestedCaseIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}
