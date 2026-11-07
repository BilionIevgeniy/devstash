import { describe, expect, it } from "vitest";

import { truncateForModel } from "@/features/ai/domain/input";

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
