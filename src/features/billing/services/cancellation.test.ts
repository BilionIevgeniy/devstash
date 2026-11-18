import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserIdByEmail: vi.fn(),
  getUserProfile: vi.fn(),
  getLiveSubscriptionRef: vi.fn(),
  getContractState: vi.fn(),
  syncSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  sendEmail: vi.fn(),
  consumeRateLimit: vi.fn(),
  consumeIpRateLimit: vi.fn(),
  isRateLimitConfigured: vi.fn(),
}));

const { Unavailable } = vi.hoisted(() => ({
  Unavailable: class Unavailable extends Error {},
}));

vi.mock("@/features/auth/queries", () => ({
  getUserIdByEmail: mocks.getUserIdByEmail,
  getUserProfile: mocks.getUserProfile,
}));
vi.mock("@/features/billing/_internal/queries", () => ({
  getLiveSubscriptionRef: mocks.getLiveSubscriptionRef,
}));
vi.mock("@/features/billing/queries", () => ({
  getContractState: mocks.getContractState,
}));
vi.mock("@/features/billing/_internal/services/subscription-sync", () => ({
  syncSubscription: mocks.syncSubscription,
}));
vi.mock("@/lib/vendors/stripe", () => ({
  getStripe: () => ({ subscriptions: { update: mocks.updateSubscription } }),
}));
vi.mock("@/lib/vendors/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/vendors/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  consumeIpRateLimit: mocks.consumeIpRateLimit,
  isRateLimitConfigured: mocks.isRateLimitConfigured,
  RateLimitUnavailableError: Unavailable,
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  cancelOwnSubscription,
  checkCancellationLimit,
  processCancellationDeclaration,
} from "@/features/billing/services/cancellation";
import { OPERATOR } from "@/lib/legal/operator";

const NOW = new Date("2026-11-18T10:00:00.000Z");
const PERIOD_END = "2026-12-18T00:00:00.000Z";
const DECLARATION = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  kind: "ordinary" as const,
};
const ALLOWED = { success: true, remaining: 1, reset: 0 };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserIdByEmail.mockResolvedValue("user-1");
  mocks.getUserProfile.mockResolvedValue({ email: "ada@example.com" });
  mocks.getLiveSubscriptionRef.mockResolvedValue({
    customerId: "cus_1",
    subscriptionId: "sub_1",
  });
  // Running before the cancellation, ending after it.
  mocks.getContractState
    .mockResolvedValueOnce({ status: "live", periodEnd: PERIOD_END })
    .mockResolvedValue({ status: "cancelling", periodEnd: PERIOD_END });
  mocks.isRateLimitConfigured.mockReturnValue(true);
  mocks.sendEmail.mockResolvedValue({ success: true, data: null, error: null });
  mocks.consumeRateLimit.mockResolvedValue(ALLOWED);
  mocks.consumeIpRateLimit.mockResolvedValue(ALLOWED);
});

describe("cancelOwnSubscription", () => {
  it("ends the subscription with its term, syncs it and confirms it", async () => {
    const result = await cancelOwnSubscription(
      "user-1",
      { kind: "ordinary" },
      "en",
      NOW,
    );

    expect(result).toEqual({
      success: true,
      error: null,
      data: { declaredAt: NOW.toISOString() },
    });
    expect(mocks.updateSubscription).toHaveBeenCalledWith("sub_1", {
      cancel_at_period_end: true,
    });
    expect(mocks.syncSubscription).toHaveBeenCalledWith("cus_1", "sub_1");
    expect(mocks.sendEmail.mock.calls[0][0].to).toBe("ada@example.com");
    expect(mocks.sendEmail.mock.calls[0][0].text).toContain(
      "December 18, 2026",
    );
  });

  it("refuses when no subscription runs", async () => {
    mocks.getContractState.mockReset().mockResolvedValue({
      status: "none",
      periodEnd: null,
    });

    const result = await cancelOwnSubscription(
      "user-1",
      { kind: "ordinary" },
      "en",
      NOW,
    );

    expect(result.error).toBe("noLiveContract");
    expect(mocks.updateSubscription).not.toHaveBeenCalled();
  });

  it("does nothing more for a contract that already ends", async () => {
    mocks.getContractState.mockReset().mockResolvedValue({
      status: "cancelling",
      periodEnd: PERIOD_END,
    });

    const result = await cancelOwnSubscription(
      "user-1",
      { kind: "extraordinary", reason: "x" },
      "en",
      NOW,
    );

    expect(result.success).toBe(true);
    expect(mocks.updateSubscription).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("sends at most one confirmation per account and day", async () => {
    await cancelOwnSubscription("user-1", { kind: "ordinary" }, "en", NOW);

    expect(mocks.sendEmail.mock.calls[0][0].idempotencyKey).toBe(
      "cancellation/user-1/2026-11-18",
    );
  });

  it("tells the operator about a cancellation for good cause", async () => {
    await cancelOwnSubscription(
      "user-1",
      { kind: "extraordinary", reason: "Moving abroad" },
      "en",
      NOW,
    );

    const notice = mocks.sendEmail.mock.calls[1][0];
    expect(notice.to).toBe(OPERATOR.email);
    expect(notice.text).toContain("Moving abroad");
  });
});

describe("checkCancellationLimit", () => {
  it("lets a declaration through within the limits", async () => {
    await expect(
      checkCancellationLimit("a@b.c", "203.0.113.1", NOW),
    ).resolves.toMatchObject({ success: true });
  });

  it("says when the requests came too often", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: NOW.getTime() + 5 * 60_000,
    });

    await expect(checkCancellationLimit("a@b.c", null, NOW)).resolves.toEqual({
      success: false,
      data: null,
      error: "tooManyAttempts",
      params: { minutes: 5 },
    });
  });

  it("fails loudly when the limiter is not configured", async () => {
    mocks.isRateLimitConfigured.mockReturnValue(false);

    await expect(checkCancellationLimit("a@b.c", null, NOW)).rejects.toThrow(
      "not configured",
    );
  });

  it("bounds the declarations in memory while the limiter is down", async () => {
    mocks.consumeIpRateLimit.mockRejectedValue(new Unavailable());
    const email = "outage@example.com";

    const answers = [];
    for (let i = 0; i < 4; i += 1) {
      answers.push((await checkCancellationLimit(email, null, NOW)).success);
    }

    expect(answers).toEqual([true, true, true, false]);
  });

  it("takes the declaration when the limiter is down", async () => {
    mocks.consumeIpRateLimit.mockRejectedValue(new Unavailable());

    await expect(
      checkCancellationLimit("a@b.c", null, NOW),
    ).resolves.toMatchObject({ success: true });
  });
});

describe("processCancellationDeclaration", () => {
  it("cancels the account's subscription and confirms to the address on file", async () => {
    await processCancellationDeclaration(DECLARATION, "de", NOW);

    expect(mocks.updateSubscription).toHaveBeenCalled();
    expect(mocks.sendEmail.mock.calls[0][0].subject).toBe(
      "Deine Kündigung von DevStash Pro",
    );
  });

  it("does nothing for an address with no account", async () => {
    mocks.getUserIdByEmail.mockResolvedValue(null);

    await processCancellationDeclaration(DECLARATION, "en", NOW);

    expect(mocks.updateSubscription).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing to an account with no running contract", async () => {
    mocks.getContractState.mockReset().mockResolvedValue({
      status: "none",
      periodEnd: null,
    });

    await processCancellationDeclaration(DECLARATION, "en", NOW);

    expect(mocks.updateSubscription).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("never carries the visitor's words to the holder, only to the operator", async () => {
    await processCancellationDeclaration(
      {
        ...DECLARATION,
        kind: "extraordinary",
        name: "Visit https://evil.test",
        reason: "Sign in at https://evil.test",
      },
      "en",
      NOW,
    );

    const [holder, operator] = mocks.sendEmail.mock.calls.map(
      (call) => call[0],
    );
    expect(holder.text).not.toContain("evil.test");
    expect(holder.html).not.toContain("evil.test");
    expect(operator.to).toBe(OPERATOR.email);
    expect(operator.text).toContain("Sign in at https://evil.test");
  });

  it("hands a failed declaration to the operator, never losing it", async () => {
    mocks.updateSubscription.mockRejectedValue(new Error("Stripe is down"));

    await processCancellationDeclaration(DECLARATION, "en", NOW);

    const notice = mocks.sendEmail.mock.calls[0][0];
    expect(notice.to).toBe(OPERATOR.email);
    expect(notice.text).toContain("ada@example.com");
  });
});
