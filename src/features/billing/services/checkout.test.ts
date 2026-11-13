import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCustomer: vi.fn(),
  createCheckout: vi.fn(),
  createPortal: vi.fn(),
  upsert: vi.fn(),
  getEntitlements: vi.fn(),
  getStripeCustomerId: vi.fn(),
  retrieveCheckout: vi.fn(),
  syncSubscription: vi.fn(),
}));

// The real check is pinned in lib/stripe.test.ts; here only this error is one.
const DEAD_CUSTOMER = vi.hoisted(() => new Error("No such customer"));
const MISSING_SESSION = vi.hoisted(() => new Error("No such session"));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    customers: { create: mocks.createCustomer },
    checkout: {
      sessions: {
        create: mocks.createCheckout,
        retrieve: mocks.retrieveCheckout,
      },
    },
    billingPortal: { sessions: { create: mocks.createPortal } },
  }),
  isStripeCustomerMissing: (error: unknown) => error === DEAD_CUSTOMER,
  isStripeNotFound: (error: unknown) => error === MISSING_SESSION,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { subscription: { upsert: mocks.upsert } },
}));
vi.mock("@/features/billing/queries", () => ({
  getEntitlements: mocks.getEntitlements,
}));
vi.mock("@/features/billing/_internal/queries", () => ({
  getStripeCustomerId: mocks.getStripeCustomerId,
}));

vi.mock("@/features/billing/_internal/services/subscription-sync", () => ({
  syncSubscription: mocks.syncSubscription,
}));

vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_monthly");
vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_yearly");

import {
  confirmCheckoutSession,
  createCheckoutSession,
  createPortalSession,
} from "@/features/billing/services/checkout";

const USER = { id: "user-1", email: "dev@example.com" };
const ORIGIN = "https://devstash.test";
const CHECKOUT_URL = "https://checkout.stripe.test/session";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getEntitlements.mockResolvedValue({ isPro: false });
  mocks.getStripeCustomerId.mockResolvedValue("cus_stored");
  mocks.createCustomer.mockResolvedValue({ id: "cus_new" });
  mocks.createCheckout.mockResolvedValue({ url: CHECKOUT_URL });
});

describe("createCheckoutSession", () => {
  it("refuses a Pro user without calling Stripe", async () => {
    mocks.getEntitlements.mockResolvedValue({ isPro: true });

    const result = await createCheckoutSession(USER, "monthly", ORIGIN);

    expect(result.success).toBe(false);
    expect(mocks.createCustomer).not.toHaveBeenCalled();
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it("reuses a stored customer", async () => {
    const result = await createCheckoutSession(USER, "yearly", ORIGIN);

    expect(result.data?.url).toBe(CHECKOUT_URL);
    expect(mocks.createCustomer).not.toHaveBeenCalled();
    expect(mocks.createCheckout.mock.calls[0][0]).toMatchObject({
      customer: "cus_stored",
      line_items: [{ price: "price_yearly", quantity: 1 }],
      metadata: { userId: USER.id },
    });
  });

  it("creates a first customer with an idempotency key", async () => {
    mocks.getStripeCustomerId.mockResolvedValue(null);

    await createCheckoutSession(USER, "monthly", ORIGIN);

    expect(mocks.createCustomer.mock.calls[0][1]).toEqual({
      idempotencyKey: "customer-user-1",
    });
    expect(mocks.createCheckout.mock.calls[0][0].customer).toBe("cus_new");
  });

  it("writes only the customer on an existing row", async () => {
    mocks.getStripeCustomerId.mockResolvedValue(null);

    await createCheckoutSession(USER, "monthly", ORIGIN);

    expect(mocks.upsert.mock.calls[0][0].update).toEqual({
      stripeCustomerId: "cus_new",
    });
  });

  it("replaces a dead customer without an idempotency key", async () => {
    mocks.createCheckout.mockRejectedValueOnce(DEAD_CUSTOMER);

    const result = await createCheckoutSession(USER, "monthly", ORIGIN);

    expect(result.data?.url).toBe(CHECKOUT_URL);
    expect(mocks.createCustomer).toHaveBeenCalledTimes(1);
    expect(mocks.createCustomer.mock.calls[0][1]).toBeUndefined();
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.createCheckout).toHaveBeenCalledTimes(2);
    expect(mocks.createCheckout.mock.calls[1][0].customer).toBe("cus_new");
  });

  it("throws when the session fails a second time", async () => {
    mocks.createCheckout.mockRejectedValue(DEAD_CUSTOMER);

    await expect(
      createCheckoutSession(USER, "monthly", ORIGIN),
    ).rejects.toThrow(DEAD_CUSTOMER);
    expect(mocks.createCheckout).toHaveBeenCalledTimes(2);
  });

  it("leaves the customer alone on any other error, a bad price too", async () => {
    const badPrice = new Error("No such price");
    mocks.createCheckout.mockRejectedValue(badPrice);

    await expect(
      createCheckoutSession(USER, "monthly", ORIGIN),
    ).rejects.toThrow(badPrice);
    expect(mocks.createCustomer).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("creates no customer when the price is not configured", async () => {
    mocks.getStripeCustomerId.mockResolvedValue(null);
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "");

    await expect(
      createCheckoutSession(USER, "monthly", ORIGIN),
    ).rejects.toThrow("not set");
    expect(mocks.createCustomer).not.toHaveBeenCalled();

    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_monthly");
  });
});

describe("createPortalSession", () => {
  it("answers with an error when there is no customer", async () => {
    mocks.getStripeCustomerId.mockResolvedValue(null);

    const result = await createPortalSession(USER.id, ORIGIN);

    expect(result.success).toBe(false);
    expect(mocks.createPortal).not.toHaveBeenCalled();
  });

  it("returns the portal URL", async () => {
    mocks.createPortal.mockResolvedValue({ url: "https://portal.test" });

    const result = await createPortalSession(USER.id, ORIGIN);

    expect(result.data?.url).toBe("https://portal.test");
    expect(mocks.createPortal.mock.calls[0][0]).toEqual({
      customer: "cus_stored",
      return_url: `${ORIGIN}/settings`,
    });
  });

  it("keeps the stored id when the customer is dead", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.createPortal.mockRejectedValue(DEAD_CUSTOMER);

    const result = await createPortalSession(USER.id, ORIGIN);

    expect(result.success).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("throws any other error", async () => {
    const outage = new Error("Stripe is down");
    mocks.createPortal.mockRejectedValue(outage);

    await expect(createPortalSession(USER.id, ORIGIN)).rejects.toThrow(outage);
  });
});

describe("confirmCheckoutSession", () => {
  const FINISHED = {
    metadata: { userId: USER.id },
    status: "complete",
    customer: "cus_1",
    subscription: "sub_1",
  };
  const NOT_CONFIRMED = {
    success: false,
    error: "This payment could not be confirmed.",
    data: null,
  };

  beforeEach(() => {
    mocks.retrieveCheckout.mockResolvedValue(FINISHED);
  });

  it("syncs the subscription of the caller's finished session", async () => {
    await expect(confirmCheckoutSession(USER.id, "cs_1")).resolves.toEqual({
      success: true,
      error: null,
      data: null,
    });

    expect(mocks.syncSubscription).toHaveBeenCalledWith("cus_1", "sub_1");
  });

  it("refuses another user's session", async () => {
    mocks.retrieveCheckout.mockResolvedValue({
      ...FINISHED,
      metadata: { userId: "someone-else" },
    });

    await expect(confirmCheckoutSession(USER.id, "cs_1")).resolves.toEqual(
      NOT_CONFIRMED,
    );
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it("refuses a session with no owner", async () => {
    mocks.retrieveCheckout.mockResolvedValue({ ...FINISHED, metadata: null });

    await expect(confirmCheckoutSession(USER.id, "cs_1")).resolves.toEqual(
      NOT_CONFIRMED,
    );
  });

  it("refuses a session that is not finished", async () => {
    mocks.retrieveCheckout.mockResolvedValue({ ...FINISHED, status: "open" });

    await expect(confirmCheckoutSession(USER.id, "cs_1")).resolves.toEqual(
      NOT_CONFIRMED,
    );
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it("refuses a session with no subscription", async () => {
    mocks.retrieveCheckout.mockResolvedValue({
      ...FINISHED,
      subscription: null,
    });

    await expect(confirmCheckoutSession(USER.id, "cs_1")).resolves.toEqual(
      NOT_CONFIRMED,
    );
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it("answers the same for a session Stripe does not have", async () => {
    mocks.retrieveCheckout.mockRejectedValue(MISSING_SESSION);

    await expect(confirmCheckoutSession(USER.id, "cs_1")).resolves.toEqual(
      NOT_CONFIRMED,
    );
  });

  it("throws any other Stripe failure", async () => {
    mocks.retrieveCheckout.mockRejectedValue(new Error("Stripe is down"));

    await expect(confirmCheckoutSession(USER.id, "cs_1")).rejects.toThrow(
      "Stripe is down",
    );
  });
});
