import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lock: vi.fn(),
  retrieve: vi.fn(),
  updateMany: vi.fn(),
}));

// The real check is pinned in lib/stripe.test.ts; here only this error is one.
const NOT_FOUND = vi.hoisted(() => new Error("No such subscription"));

vi.mock("@/lib/advisory-lock", () => ({
  LOCKED_TRANSACTION: {},
  lockForTransaction: mocks.lock,
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ subscriptions: { retrieve: mocks.retrieve } }),
  isStripeNotFound: (error: unknown) => error === NOT_FOUND,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (run: (tx: unknown) => Promise<void>) =>
      run({ subscription: { updateMany: mocks.updateMany } }),
  },
}));

import { syncSubscription } from "@/features/billing/_internal/services/subscription-sync";

const PERIOD_END_SECONDS = 1_800_000_000;

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.retrieve.mockResolvedValue({
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    items: { data: [{ current_period_end: PERIOD_END_SECONDS }] },
  });
});

describe("syncSubscription", () => {
  it("takes the customer's lock before it reads Stripe", async () => {
    await syncSubscription("cus_1", "sub_1");

    expect(mocks.lock.mock.calls[0][1]).toBe("stripe-customer:cus_1");
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.retrieve.mock.invocationCallOrder[0],
    );
  });

  it("saves the state Stripe reports, with the period of its item", async () => {
    await syncSubscription("cus_1", "sub_1");

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_1" },
      data: {
        status: "active",
        stripeSubscriptionId: "sub_1",
        currentPeriodEnd: new Date(PERIOD_END_SECONDS * 1000),
      },
    });
  });

  it("reads the customer of an expanded subscription", async () => {
    mocks.retrieve.mockResolvedValue({
      id: "sub_1",
      customer: { id: "cus_1" },
      status: "active",
      items: { data: [] },
    });

    await syncSubscription("cus_1", "sub_1");

    expect(mocks.updateMany.mock.calls[0][0]).toMatchObject({
      where: { stripeCustomerId: "cus_1" },
      data: { currentPeriodEnd: null },
    });
  });

  it("writes nothing for a subscription Stripe no longer has", async () => {
    mocks.retrieve.mockRejectedValue(NOT_FOUND);

    await expect(syncSubscription("cus_1", "sub_1")).resolves.toBeUndefined();

    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("throws any other Stripe failure, so the webhook is retried", async () => {
    mocks.retrieve.mockRejectedValue(new Error("Stripe is down"));

    await expect(syncSubscription("cus_1", "sub_1")).rejects.toThrow(
      "Stripe is down",
    );
  });

  it("succeeds when no row matches: a deleted account", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(syncSubscription("cus_1", "sub_1")).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalled();
  });
});
