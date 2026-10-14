/** A secure tip is a report about a wanted person. Other submissions on the account are community reports. */
export function isSecureTip(sighting: { subjectEntityProfileId: string | null }) {
  return Boolean(sighting.subjectEntityProfileId);
}

export function isAccountReport(sighting: { subjectEntityProfileId: string | null }) {
  return !isSecureTip(sighting);
}

/** Still waiting on a reviewer. Approved, rejected, and duplicate tips are closed. */
export function isActiveTip(sighting: { subjectEntityProfileId: string | null; moderationStatus: string }) {
  return isSecureTip(sighting) && sighting.moderationStatus === "PENDING";
}

export function sightingStatusLabel(moderationStatus: string) {
  switch (moderationStatus) {
    case "PENDING":
      return "Pending review";
    case "APPROVED":
      return "Reviewed";
    case "REJECTED":
      return "Not accepted";
    case "DUPLICATE":
      return "Duplicate";
    default:
      return moderationStatus;
  }
}

export function sightingPlace(location: unknown): string | null {
  if (!location || typeof location !== "object" || !("address" in location)) return null;
  const address = location.address;
  return typeof address === "string" && address.trim() ? address.trim() : null;
}

export function formatSightingDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
