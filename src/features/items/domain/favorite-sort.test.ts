import { describe, expect, it } from "vitest";

import { compareNames } from "@/features/items/domain/favorite-sort";

// The order of the /pinned groups and of the favorite collections.
describe("compareNames", () => {
  it("goes by letter, not capitals first", () => {
    expect(["beta", "Alpha", "gamma"].toSorted(compareNames)).toEqual([
      "Alpha",
      "beta",
      "gamma",
    ]);
  });

  it("takes names that differ only in case as equal", () => {
    expect(compareNames("snippet", "Snippet")).toBe(0);
  });
});
