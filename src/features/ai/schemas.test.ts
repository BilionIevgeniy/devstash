import { describe, expect, it } from "vitest";

import { AI_INPUT_MAX } from "@/features/ai/domain/input";
import {
  aiItemInputSchema,
  explainInputSchema,
  optimizePromptInputSchema,
} from "@/features/ai/schemas";

describe("optimizePromptInputSchema", () => {
  it("accepts a prompt with a blank title", () => {
    expect(
      optimizePromptInputSchema.safeParse({ title: "", prompt: "Review it" })
        .success,
    ).toBe(true);
  });

  it("refuses a blank prompt", () => {
    expect(
      optimizePromptInputSchema.safeParse({ title: "Review", prompt: " \n " })
        .success,
    ).toBe(false);
  });
});

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

describe("explainInputSchema", () => {
  const input = { title: "useAuth", language: "typescript", code: "x()" };

  it("accepts code with a language", () => {
    expect(explainInputSchema.safeParse(input).success).toBe(true);
  });

  it("accepts code saved without a language", () => {
    expect(
      explainInputSchema.safeParse({ ...input, language: null }).success,
    ).toBe(true);
  });

  it("refuses blank code", () => {
    expect(
      explainInputSchema.safeParse({ ...input, code: " \n " }).success,
    ).toBe(false);
  });

  it("refuses code over the ceiling", () => {
    expect(
      explainInputSchema.safeParse({
        ...input,
        code: "a".repeat(AI_INPUT_MAX + 1),
      }).success,
    ).toBe(false);
  });
});
