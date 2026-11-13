import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import {
  confirmCheckoutSession,
  createCheckoutSession,
  createPortalSession,
} from "@/features/billing/services/checkout";
import { deleteBillingCustomer } from "@/features/billing/services/customer";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// Stripe is mocked; the rows are real. The cases are the ones where an id from
// the request (a Checkout session) or the caller's own row decides which
// subscription is written.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
  // A has a billing account too, on its own customer, but no live plan.
  await prisma.subscription.create({
    data: {
      userId: t.a.userId,
      status: "canceled",
      stripeCustomerId: "cus_test_a",
    },
  });
});

function stripeWith(client: object) {
  vi.mocked(getStripe).mockReturnValue(client as ReturnType<typeof getStripe>);
}

describe("confirmCheckoutSession", () => {
  it("refuses B's finished session for A and writes nothing", async () => {
    const retrieve = vi.fn(async () => ({
      metadata: { userId: t.b.userId },
      status: "complete",
      customer: "cus_test_pro",
      subscription: "sub_test_pro",
    }));
    const subscriptions = { retrieve: vi.fn() };
    stripeWith({ checkout: { sessions: { retrieve } }, subscriptions });
    const before = {
      a: await snapshotTenant(t.a.userId),
      b: await snapshotTenant(t.b.userId),
    };

    const result = await confirmCheckoutSession(t.a.userId, "cs_of_b");

    expect(result).toEqual({
      success: false,
      error: "This payment could not be confirmed.",
      data: null,
    });
    expect(subscriptions.retrieve).not.toHaveBeenCalled();
    expect(await snapshotTenant(t.a.userId)).toEqual(before.a);
    expect(await snapshotTenant(t.b.userId)).toEqual(before.b);
  });
});

describe("createCheckoutSession", () => {
  function checkoutStripe() {
    const createCustomer = vi.fn(async () => ({ id: "cus_new_a" }));
    const createSession = vi.fn(async () => ({ url: "https://checkout.test" }));
    stripeWith({
      customers: { create: createCustomer },
      checkout: { sessions: { create: createSession } },
    });
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_test_monthly");
    return { createCustomer, createSession };
  }

  it("uses the caller's stored customer, never B's", async () => {
    const { createCustomer, createSession } = checkoutStripe();
    const before = await snapshotTenant(t.b.userId);

    const result = await createCheckoutSession(
      { id: t.a.userId, email: t.a.email },
      "monthly",
      "http://localhost",
    );

    expect(result.success).toBe(true);
    expect(createCustomer).not.toHaveBeenCalled();
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_test_a",
        metadata: { userId: t.a.userId },
      }),
    );
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  it("stores a new customer on the caller's own row", async () => {
    await prisma.subscription.delete({ where: { userId: t.a.userId } });
    checkoutStripe();
    const before = await snapshotTenant(t.b.userId);

    await createCheckoutSession(
      { id: t.a.userId, email: t.a.email },
      "monthly",
      "http://localhost",
    );

    const a = await prisma.subscription.findUniqueOrThrow({
      where: { userId: t.a.userId },
    });
    expect(a.stripeCustomerId).toBe("cus_new_a");
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

describe("createPortalSession", () => {
  it("opens the portal on the caller's own customer", async () => {
    const create = vi.fn(async () => ({ url: "https://billing.test/a" }));
    stripeWith({ billingPortal: { sessions: { create } } });

    const result = await createPortalSession(t.a.userId, "http://localhost");

    expect(result.success).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_test_a" }),
    );
  });
});

describe("deleteBillingCustomer", () => {
  it("deletes and clears only the caller's customer", async () => {
    const del = vi.fn(async () => ({}));
    stripeWith({ customers: { del } });
    const before = await snapshotTenant(t.b.userId);

    await deleteBillingCustomer(t.a.userId);

    expect(del).toHaveBeenCalledWith("cus_test_a");
    expect(del).toHaveBeenCalledTimes(1);
    const a = await prisma.subscription.findUniqueOrThrow({
      where: { userId: t.a.userId },
    });
    expect(a.stripeCustomerId).toBeNull();
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});
