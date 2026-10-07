import { describe, expect, it } from "vitest";

import type { communitySighting } from "@Sentinel360/db/schema/sightings";

import {
  mergeSuggestedCaseIds,
  readSuggestedCaseIds,
  toCommunitySightingView,
} from "../services/sighting-case-link-rules";
import { submitSightingSchema, verifySightingSchema } from "../validators";

type SightingRow = typeof communitySighting.$inferSelect;

const SIGHTING_ID = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "22222222-2222-4222-8222-222222222222";

describe("mergeSuggestedCaseIds", () => {
  const statuses = new Map([
    ["watch-case", "UNDER_INVESTIGATION"],
    ["suspect-case", "OPEN"],
    ["closed-case", "CLOSED"],
    ["archived-case", "ARCHIVED"],
  ]);

  it("puts watchlist cases before suspect cases", () => {
    expect(mergeSuggestedCaseIds(["watch-case"], ["suspect-case"], statuses)).toEqual([
      "watch-case",
      "suspect-case",
    ]);
  });

  it("de-duplicates a case that appears in both sources", () => {
    expect(mergeSuggestedCaseIds(["watch-case"], ["watch-case", "suspect-case"], statuses)).toEqual([
      "watch-case",
      "suspect-case",
    ]);
  });

  it("drops closed and archived cases", () => {
    expect(mergeSuggestedCaseIds(["closed-case"], ["archived-case", "suspect-case"], statuses)).toEqual([
      "suspect-case",
    ]);
  });

  it("drops watchlist entries with no case and unknown case ids", () => {
    expect(mergeSuggestedCaseIds([null, "missing"], [], statuses)).toEqual([]);
  });
});

describe("toCommunitySightingView", () => {
  it("strips case suggestions, incident, duplicate pointer and operator notes", () => {
    const row = {
      id: SIGHTING_ID,
      referenceCode: "ST-2026-00001",
      subjectEntityProfileId: "profile-1",
      suggestedCaseIds: [CASE_ID],
      linkedIncidentId: "incident-1",
      duplicateOfSightingId: "other",
      operatorNotes: "internal",
      moderationStatus: "APPROVED",
    } as unknown as SightingRow;

    const view = toCommunitySightingView(row) as Record<string, unknown>;

    expect(view).not.toHaveProperty("suggestedCaseIds");
    expect(view).not.toHaveProperty("linkedIncidentId");
    expect(view).not.toHaveProperty("duplicateOfSightingId");
    expect(view).not.toHaveProperty("operatorNotes");
    expect(view).toMatchObject({
      id: SIGHTING_ID,
      referenceCode: "ST-2026-00001",
      subjectEntityProfileId: "profile-1",
      moderationStatus: "APPROVED",
    });
  });
});

describe("readSuggestedCaseIds", () => {
  it("keeps only string ids", () => {
    expect(readSuggestedCaseIds([CASE_ID, 3, null])).toEqual([CASE_ID]);
    expect(readSuggestedCaseIds({})).toEqual([]);
  });
});

describe("sighting validators", () => {
  it("accepts an optional wanted-person subject on submit", () => {
    const parsed = submitSightingSchema.parse({
      description: "Seen near the taxi rank",
      subjectEntityProfileId: CASE_ID,
    });
    expect(parsed.subjectEntityProfileId).toBe(CASE_ID);
    expect(submitSightingSchema.safeParse({ description: "x", subjectEntityProfileId: "nope" }).success).toBe(
      false,
    );
  });

  it("defaults verify to no case link and no photo evidence", () => {
    const parsed = verifySightingSchema.parse({ id: SIGHTING_ID, decision: "APPROVED" });
    expect(parsed.caseLink).toEqual({ mode: "none" });
    expect(parsed.attachPhotosAsEvidence).toBe(false);
  });

  it("requires a case id when linking to an existing case", () => {
    expect(
      verifySightingSchema.safeParse({ id: SIGHTING_ID, decision: "APPROVED", caseLink: { mode: "existing" } })
        .success,
    ).toBe(false);
    expect(
      verifySightingSchema.safeParse({
        id: SIGHTING_ID,
        decision: "APPROVED",
        caseLink: { mode: "existing", caseId: CASE_ID },
      }).success,
    ).toBe(true);
  });

  it("accepts a new-case link with an optional title", () => {
    const parsed = verifySightingSchema.parse({
      id: SIGHTING_ID,
      decision: "APPROVED",
      caseLink: { mode: "new" },
    });
    expect(parsed.caseLink).toEqual({ mode: "new" });
  });
});
