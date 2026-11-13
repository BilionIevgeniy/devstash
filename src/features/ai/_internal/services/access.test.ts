import { beforeEach, describe, expect, it, vi } from "vitest";

const { consumeRateLimit, getEntitlements } = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getEntitlements: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));

import { checkAiAccess } from "@/features/ai/_internal/services/access";
import {
  AI_APP_LIMIT_KEY,
  AI_BY_APP_DAY,
  AI_BY_USER_DAY,
  AI_BY_USER_HOUR,
} from "@/features/ai/domain/rate-limits";

const allowed = { success: true, remaining: 10, reset: Date.now() };
const blocked = { success: false, remaining: 0, reset: Date.now() + 60_000 };

describe("checkAiAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEntitlements.mockResolvedValue({ isPro: true });
    consumeRateLimit.mockResolvedValue(allowed);
  });

  it("refuses a Free user without counting a request", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(checkAiAccess("user-1")).resolves.toEqual({
      success: false,
      data: null,
      error: "aiProOnly",
      reason: "not-pro",
    });
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("counts the user's limits and the app's limit for a Pro user", async () => {
    await expect(checkAiAccess("user-1")).resolves.toEqual({
      success: true,
      error: null,
    });
    expect(consumeRateLimit).toHaveBeenCalledWith(AI_BY_USER_HOUR, "user-1");
    expect(consumeRateLimit).toHaveBeenCalledWith(AI_BY_USER_DAY, "user-1");
    expect(consumeRateLimit).toHaveBeenCalledWith(
      AI_BY_APP_DAY,
      AI_APP_LIMIT_KEY,
    );
  });

  it("refuses everyone once the app's daily limit is used up", async () => {
    consumeRateLimit
      .mockResolvedValueOnce(allowed)
      .mockResolvedValueOnce(allowed)
      .mockResolvedValueOnce(blocked);

    await expect(checkAiAccess("user-1")).resolves.toEqual({
      success: false,
      data: null,
      error: "aiAppLimit",
      reason: "limited",
    });
  });

  it("refuses past the hourly limit, in minutes", async () => {
    consumeRateLimit.mockResolvedValueOnce(blocked);

    const result = await checkAiAccess("user-1");

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ reason: "limited" });
    expect(result.error).toBe("tooManyAttempts");
    expect(result).toHaveProperty("params.minutes", 1);
    expect(consumeRateLimit).toHaveBeenCalledTimes(1);
  });

  it("refuses past the daily limit in its own words", async () => {
    consumeRateLimit
      .mockResolvedValueOnce(allowed)
      .mockResolvedValueOnce(blocked);

    await expect(checkAiAccess("user-1")).resolves.toEqual({
      success: false,
      data: null,
      error: "aiDailyLimit",
      reason: "limited",
    });
  });

  it("fails closed when Upstash is down", async () => {
    consumeRateLimit.mockRejectedValue(
      new Error("Rate limiting is unavailable"),
    );

    await expect(checkAiAccess("user-1")).rejects.toThrow();
  });
});
