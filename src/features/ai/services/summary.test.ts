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
  SUMMARY_CONTENT_MAX,
  SUMMARY_TITLE_MAX,
} from "@/features/ai/domain/input";
import {
  AI_FAILURE_MESSAGES,
  AI_PRO_ONLY_MESSAGE,
} from "@/features/ai/domain/messages";
import { summarizeItem } from "@/features/ai/services/summary";
import { AiOutputError } from "@/lib/openai";

const allowed = { success: true, remaining: 10, reset: Date.now() };
const input = {
  title: "useAuth Hook",
  content: "export function useAuth() {}",
};

describe("summarizeItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    getEntitlements.mockResolvedValue({ isPro: true });
    consumeRateLimit.mockResolvedValue(allowed);
    generateStructured.mockResolvedValue({
      summary: ' "A React hook that reads the session." ',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the normalized summary", async () => {
    await expect(summarizeItem("user-1", input)).resolves.toEqual({
      success: true,
      error: null,
      data: "A React hook that reads the session.",
    });
  });

  it("refuses a Free user before any OpenAI call", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(summarizeItem("user-1", input)).resolves.toMatchObject({
      success: false,
      error: AI_PRO_ONLY_MESSAGE,
    });
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("refuses a user past a limit before any OpenAI call", async () => {
    consumeRateLimit.mockResolvedValue({ ...allowed, success: false });

    const result = await summarizeItem("user-1", input);

    expect(result.success).toBe(false);
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("sends more of the item than tags do, and no more", async () => {
    await summarizeItem("user-1", {
      title: "t".repeat(SUMMARY_TITLE_MAX + 50),
      content: "c".repeat(SUMMARY_CONTENT_MAX + 50),
    });

    const { input: sent } = generateStructured.mock.calls[0][0];
    expect(sent).toContain("t".repeat(SUMMARY_TITLE_MAX));
    expect(sent).not.toContain("t".repeat(SUMMARY_TITLE_MAX + 1));
    expect(sent).toContain("c".repeat(SUMMARY_CONTENT_MAX));
    expect(sent).not.toContain("c".repeat(SUMMARY_CONTENT_MAX + 1));
  });

  it("treats an empty answer as a failed one", async () => {
    generateStructured.mockResolvedValue({ summary: ' "" ' });

    await expect(summarizeItem("user-1", input)).resolves.toEqual({
      success: false,
      error: AI_FAILURE_MESSAGES.failed,
      data: null,
    });
  });

  it("answers a refusal in plain words", async () => {
    generateStructured.mockRejectedValue(new AiOutputError("refusal"));

    await expect(summarizeItem("user-1", input)).resolves.toMatchObject({
      success: false,
      error: AI_FAILURE_MESSAGES.refused,
    });
  });

  it("throws an unknown failure to the action", async () => {
    generateStructured.mockRejectedValue(new TypeError("bug"));

    await expect(summarizeItem("user-1", input)).rejects.toThrow("bug");
  });
});
