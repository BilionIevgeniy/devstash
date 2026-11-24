import { beforeEach, describe, expect, it, vi } from "vitest";

const { consumeRateLimit, getEntitlements } = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getEntitlements: vi.fn(),
}));
vi.mock("@/lib/vendors/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));

import { checkAiAccess } from "@/features/ai/_internal/services/access";
import {
  AI_APP_LIMIT_KEY,
  AI_BY_APP_DAY,
  AI_BY_USER_DAY,
  AI_BY_USER_HOUR,
} from "@/features/ai/domain/rate-limits";
import { fail } from "@/lib/errors/action-result";

const NOW = 1_700_000_000_000;
const allowed = { success: true, remaining: 10, reset: NOW };
const blocked = { success: false, remaining: 0, reset: NOW + 60_000 };

describe("checkAiAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    getEntitlements.mockResolvedValue({ isPro: true });
    consumeRateLimit.mockResolvedValue(allowed);
  });

  it("refuses a Free user without counting a request", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(checkAiAccess("user-1")).resolves.toEqual({
      success: false,
      refusal: { reason: "not-pro", failure: fail("aiProOnly") },
    });
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("counts the user's limits and the app's limit for a Pro user", async () => {
    await expect(checkAiAccess("user-1")).resolves.toEqual({ success: true });
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
      refusal: {
        reason: "limited",
        failure: fail("aiAppLimit"),
        retryAfterSeconds: 60,
      },
    });
  });

  it("refuses past the hourly limit, in minutes", async () => {
    consumeRateLimit.mockResolvedValueOnce(blocked);

    await expect(checkAiAccess("user-1")).resolves.toEqual({
      success: false,
      refusal: {
        reason: "limited",
        failure: fail("tooManyAttempts", { minutes: 1 }),
        retryAfterSeconds: 60,
      },
    });
    expect(consumeRateLimit).toHaveBeenCalledTimes(1);
  });

  it("refuses past the daily limit in its own words", async () => {
    consumeRateLimit
      .mockResolvedValueOnce(allowed)
      .mockResolvedValueOnce(blocked);

    await expect(checkAiAccess("user-1")).resolves.toEqual({
      success: false,
      refusal: {
        reason: "limited",
        failure: fail("aiDailyLimit"),
        retryAfterSeconds: 60,
      },
    });
  });

  it("fails closed when Upstash is down", async () => {
    consumeRateLimit.mockRejectedValue(
      new Error("Rate limiting is unavailable"),
    );

    await expect(checkAiAccess("user-1")).rejects.toThrow();
  });
});
