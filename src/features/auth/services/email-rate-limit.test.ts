import { beforeEach, describe, expect, it, vi } from "vitest";

const { consumeRateLimit, consumeIpRateLimit } = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  consumeIpRateLimit: vi.fn(),
}));
vi.mock("@/lib/vendors/rate-limit", () => ({
  consumeRateLimit,
  consumeIpRateLimit,
  RateLimitUnavailableError: class RateLimitUnavailableError extends Error {},
}));

import {
  EMAIL_BY_IP,
  RESET_EMAIL_BY_ADDRESS,
} from "@/features/auth/domain/rate-limits";
import { checkEmailSend } from "@/features/auth/services/email-rate-limit";
import { RateLimitUnavailableError } from "@/lib/vendors/rate-limit";

const check = () =>
  checkEmailSend(RESET_EMAIL_BY_ADDRESS, "ada@example.com", "203.0.113.1");

describe("checkEmailSend", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    consumeRateLimit.mockResolvedValue({ success: true });
    consumeIpRateLimit.mockResolvedValue({ success: true });
  });

  it("allows a send both counters have room for", async () => {
    expect(await check()).toEqual({ status: "allowed" });
    expect(consumeRateLimit).toHaveBeenCalledWith(
      RESET_EMAIL_BY_ADDRESS,
      "ada@example.com",
    );
    expect(consumeIpRateLimit).toHaveBeenCalledWith(EMAIL_BY_IP, "203.0.113.1");
  });

  // Repeated clicks on "Resend" must not use up the budget of the client.
  it("asks the address first and leaves the client's budget alone when it refuses", async () => {
    consumeRateLimit.mockResolvedValue({ success: false });

    expect(await check()).toEqual({ status: "address-limited" });
    expect(consumeIpRateLimit).not.toHaveBeenCalled();
  });

  it("says openly that the client used up its sends, and until when", async () => {
    consumeIpRateLimit.mockResolvedValue({ success: false, reset: 42 });

    expect(await check()).toEqual({ status: "ip-limited", reset: 42 });
  });

  // An error would show which addresses exist: registration asks only for a
  // pending account.
  it.each([consumeRateLimit, consumeIpRateLimit])(
    "sends nothing and stays neutral while the limiter is unavailable",
    async (limiter) => {
      limiter.mockRejectedValue(new RateLimitUnavailableError());

      expect(await check()).toEqual({ status: "address-limited" });
    },
  );

  it("throws anything else", async () => {
    consumeRateLimit.mockRejectedValue(new TypeError("a bug"));

    await expect(check()).rejects.toThrow("a bug");
  });
});
