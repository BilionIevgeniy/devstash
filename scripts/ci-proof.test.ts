import { describe, expect, it } from "vitest";

describe("CI proof", () => {
  it("fails on purpose to show that CI turns red", () => {
    expect(1 + 1).toBe(3);
  });
});
