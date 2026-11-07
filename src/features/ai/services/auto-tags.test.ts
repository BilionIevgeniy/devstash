import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { consumeRateLimit, generateStructured, getEntitlements } = vi.hoisted(
  () => ({
    consumeRateLimit: vi.fn(),
    generateStructured: vi.fn(),
    getEntitlements: vi.fn(),
  }),
);
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/lib/openai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/openai")>()),
  generateStructured,
}));

import {
  AUTO_TAG_CONTENT_MAX,
  AUTO_TAG_TITLE_MAX,
} from "@/features/ai/domain/input";
import {
  AI_FAILURE_MESSAGES,
  AI_PRO_ONLY_MESSAGE,
} from "@/features/ai/domain/messages";
import { suggestTags } from "@/features/ai/services/auto-tags";
import { AiOutputError } from "@/lib/openai";

const allowed = { success: true, remaining: 10, reset: Date.now() };
const input = {
  title: "useAuth Hook",
  content: "export function useAuth() {}",
};

describe("suggestTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    getEntitlements.mockResolvedValue({ isPro: true });
    consumeRateLimit.mockResolvedValue(allowed);
    generateStructured.mockResolvedValue({ tags: ["React", "hooks", "react"] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the normalized tags", async () => {
    await expect(suggestTags("user-1", input)).resolves.toEqual({
      success: true,
      error: null,
      data: ["react", "hooks"],
    });
  });

  it("refuses a Free user before any OpenAI call", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(suggestTags("user-1", input)).resolves.toMatchObject({
      success: false,
      error: AI_PRO_ONLY_MESSAGE,
    });
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("refuses a user past a limit before any OpenAI call", async () => {
    consumeRateLimit.mockResolvedValue({ ...allowed, success: false });

    const result = await suggestTags("user-1", input);

    expect(result.success).toBe(false);
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("reaches no OpenAI call when Upstash is down", async () => {
    consumeRateLimit.mockRejectedValue(
      new Error("Rate limiting is unavailable"),
    );

    await expect(suggestTags("user-1", input)).rejects.toThrow();
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("sends only the start of a long title and content", async () => {
    await suggestTags("user-1", {
      title: "t".repeat(AUTO_TAG_TITLE_MAX + 50),
      content: "c".repeat(AUTO_TAG_CONTENT_MAX + 50),
    });

    const { input: sent } = generateStructured.mock.calls[0][0];
    expect(sent).toContain("t".repeat(AUTO_TAG_TITLE_MAX));
    expect(sent).not.toContain("t".repeat(AUTO_TAG_TITLE_MAX + 1));
    expect(sent).toContain("c".repeat(AUTO_TAG_CONTENT_MAX));
    expect(sent).not.toContain("c".repeat(AUTO_TAG_CONTENT_MAX + 1));
  });

  it("answers an answer cut short in plain words", async () => {
    generateStructured.mockRejectedValue(
      new AiOutputError("max_output_tokens"),
    );

    await expect(suggestTags("user-1", input)).resolves.toMatchObject({
      success: false,
      error: AI_FAILURE_MESSAGES.failed,
    });
  });

  it("answers a refusal in plain words", async () => {
    generateStructured.mockRejectedValue(new AiOutputError("refusal"));

    await expect(suggestTags("user-1", input)).resolves.toMatchObject({
      error: AI_FAILURE_MESSAGES.refused,
    });
  });

  it("throws an unknown failure to the action", async () => {
    generateStructured.mockRejectedValue(new TypeError("bug"));

    await expect(suggestTags("user-1", input)).rejects.toThrow("bug");
  });
});
