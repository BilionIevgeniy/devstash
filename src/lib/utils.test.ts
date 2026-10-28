import { describe, expect, it } from "vitest";
import { getInitials } from "@/lib/utils";

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
