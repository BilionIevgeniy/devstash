import { describe, expect, it } from "vitest";

import { AI_INPUT_MAX } from "@/features/ai/domain/input";
import { aiItemInputSchema } from "@/features/ai/schemas";

describe("aiItemInputSchema", () => {
  it("accepts a title without content", () => {
    expect(
      aiItemInputSchema.safeParse({ title: "useAuth", content: "" }).success,
    ).toBe(true);
  });

  it("refuses an item with nothing to tag", () => {
    expect(
      aiItemInputSchema.safeParse({ title: "  ", content: "\n" }).success,
    ).toBe(false);
  });

  it("refuses content over the ceiling", () => {
    const result = aiItemInputSchema.safeParse({
      title: "Long",
      content: "a".repeat(AI_INPUT_MAX + 1),
    });

    expect(result.success).toBe(false);
  });

  it("accepts content at the ceiling, to be truncated later", () => {
    const result = aiItemInputSchema.safeParse({
      title: "Long",
      content: "a".repeat(AI_INPUT_MAX),
    });

    expect(result.success).toBe(true);
  });
});
