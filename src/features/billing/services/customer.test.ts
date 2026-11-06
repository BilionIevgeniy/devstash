import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  del: vi.fn(),
  updateMany: vi.fn(),
  getStripeCustomerId: vi.fn(),
}));

// The real check is pinned in lib/stripe.test.ts; here only this error is one.
const MISSING_CUSTOMER = vi.hoisted(() => new Error("No such customer"));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ customers: { del: mocks.del } }),
  isStripeNotFound: (error: unknown) => error === MISSING_CUSTOMER,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { subscription: { updateMany: mocks.updateMany } },
}));
vi.mock("@/features/billing/_internal/queries", () => ({
  getStripeCustomerId: mocks.getStripeCustomerId,
}));

import { deleteBillingCustomer } from "@/features/billing/services/customer";

const CLEARED_ROW = {
  where: { userId: "user-1" },
  data: {
    status: "canceled",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getStripeCustomerId.mockResolvedValue("cus_1");
});

describe("deleteBillingCustomer", () => {
  it("deletes the customer, then clears the row", async () => {
    await deleteBillingCustomer("user-1");

    expect(mocks.del).toHaveBeenCalledWith("cus_1");
    expect(mocks.updateMany).toHaveBeenCalledWith(CLEARED_ROW);
    expect(mocks.del.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.updateMany.mock.invocationCallOrder[0],
    );
  });

  it("clears the row when Stripe no longer has the customer", async () => {
    mocks.del.mockRejectedValue(MISSING_CUSTOMER);

    await deleteBillingCustomer("user-1");

    expect(mocks.updateMany).toHaveBeenCalledWith(CLEARED_ROW);
  });

  it("leaves the demo user's row alone: no customer id", async () => {
    mocks.getStripeCustomerId.mockResolvedValue(null);

    await deleteBillingCustomer("user-1");

    expect(mocks.del).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("keeps the row as it is when Stripe fails", async () => {
    mocks.del.mockRejectedValue(new Error("Stripe is down"));

    await expect(deleteBillingCustomer("user-1")).rejects.toThrow(
      "Stripe is down",
    );
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
