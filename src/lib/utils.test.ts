import { describe, expect, it } from "vitest";
import { compareNames, getInitials } from "@/lib/utils";

describe("getInitials", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(getInitials("ada lovelace")).toBe("AL");
  });

  it("keeps only two letters for longer names", () => {
    expect(getInitials("Mary Jane Watson")).toBe("MJ");
  });

  it("returns one letter for a single word", () => {
    expect(getInitials("Ada")).toBe("A");
  });
});

// The order of the custom types, the /pinned groups and the favorite collections.
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
