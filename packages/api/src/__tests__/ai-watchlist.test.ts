import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@Sentinel360/db";
import { entityProfile, watchlistEntry } from "@Sentinel360/db/schema/entities";

import { listAiWatchlist, readWatchlistSuggestions } from "../services/ai-watchlist";

type Row = Record<string, unknown>;

/** Answers each select from `rows` keyed by the table passed to from(). */
function fakeSelect(rows: Map<unknown, Row[]>) {
  vi.mocked(db.select).mockImplementation((() => {
    let table: unknown;
    const chain: Row = {};
    for (const method of ["where", "orderBy"]) chain[method] = () => chain;
    chain.from = (t: unknown) => {
      table = t;
      return chain;
    };
    chain.then = (resolve: (r: Row[]) => unknown) => resolve(rows.get(table) ?? []);
    return chain;
  }) as unknown as typeof db.select);
}

describe("listAiWatchlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns photographed wanted persons with their newest active priority", async () => {
    fakeSelect(
      new Map<unknown, Row[]>([
        [
          entityProfile,
          [
            { id: "p1", displayName: "One", photoUrl: "https://x/p1.jpg" },
            { id: "p2", displayName: null, photoUrl: "https://x/p2.jpg" },
          ],
        ],
        [
          watchlistEntry,
          // Newest first (the query orders by updatedAt desc).
          [
            { entityProfileId: "p1", priorityLevel: "CRITICAL" },
            { entityProfileId: "p1", priorityLevel: "LOW" },
          ],
        ],
      ]),
    );

    expect(await listAiWatchlist()).toEqual([
      { entityProfileId: "p1", displayName: "One", photoUrl: "https://x/p1.jpg", priorityLevel: "CRITICAL" },
      { entityProfileId: "p2", displayName: null, photoUrl: "https://x/p2.jpg", priorityLevel: null },
    ]);
  });

  it("skips the entry query when nobody is wanted", async () => {
    fakeSelect(new Map());
    expect(await listAiWatchlist()).toEqual([]);
    expect(db.select).toHaveBeenCalledTimes(1);
  });
});

describe("readWatchlistSuggestions", () => {
  it("keeps only uuid ids with a similarity in range", () => {
    const id = "44444444-4444-4444-8444-444444444444";
    expect(
      readWatchlistSuggestions({
        watchlistMatches: [
          { entityProfileId: id, similarity: 0.5 },
          { entityProfileId: id, similarity: 1.5 },
          { entityProfileId: "x", similarity: 0.5 },
          null,
          "nope",
        ],
      }),
    ).toEqual([{ entityProfileId: id, similarity: 0.5 }]);
    expect(readWatchlistSuggestions({})).toEqual([]);
    expect(readWatchlistSuggestions(undefined)).toEqual([]);
  });
});
