import { describe, expect, it } from "vitest";

import { isCutForModel, truncateForModel } from "@/features/ai/domain/input";

describe("truncateForModel", () => {
  it("keeps a text at the limit as it is", () => {
    expect(truncateForModel("abcde", 5)).toBe("abcde");
  });

  it("cuts a text past the limit", () => {
    expect(truncateForModel("abcdef", 5)).toBe("abcde");
  });

  it("does not split a character outside the basic plane", () => {
    // "😀" is two UTF-16 units; the limit falls between them.
    expect(truncateForModel("abcd😀", 5)).toBe("abcd");
  });
});

describe("isCutForModel", () => {
  it("says a text at the limit is whole", () => {
    expect(isCutForModel("a".repeat(8_000), 8_000)).toBe(false);
  });

  it("says a text past the limit is cut", () => {
    expect(isCutForModel("a".repeat(8_001), 8_000)).toBe(true);
  });

  it("agrees with truncateForModel when the limit splits a character", () => {
    // Five units: "abcd" and the two halves of "😀" at the limit of 5.
    expect(isCutForModel("abcd😀", 5)).toBe(true);
    expect(isCutForModel("abcd😀", 6)).toBe(false);
  });
});
