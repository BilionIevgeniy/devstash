import { beforeEach, describe, expect, it, vi } from "vitest";

const { syncSubscription } = vi.hoisted(() => ({
  syncSubscription: vi.fn(),
}));
vi.mock("@/features/billing/_internal/services/subscription-sync", () => ({
  syncSubscription,
}));

import { handleStripeEvent } from "@/features/billing/services/webhook";
import type { StripeEvent } from "@/lib/stripe";

function event(type: string, object: unknown): StripeEvent {
  return { type, data: { object } } as unknown as StripeEvent;
}

function checkoutEvent(session: Record<string, unknown>): StripeEvent {
  return event("checkout.session.completed", {
    mode: "subscription",
    customer: "cus_1",
    subscription: "sub_1",
    ...session,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("handleStripeEvent", () => {
  it("syncs the subscription of a completed Checkout", async () => {
    await handleStripeEvent(checkoutEvent({}));

    expect(syncSubscription).toHaveBeenCalledWith("cus_1", "sub_1");
  });

  it("reads expanded references of a Checkout session", async () => {
    await handleStripeEvent(
      checkoutEvent({
        customer: { id: "cus_1" },
        subscription: { id: "sub_1" },
      }),
    );

    expect(syncSubscription).toHaveBeenCalledWith("cus_1", "sub_1");
  });

  it.each(["customer.subscription.updated", "customer.subscription.deleted"])(
    "syncs the subscription named by %s",
    async (type) => {
      await handleStripeEvent(event(type, { id: "sub_1", customer: "cus_1" }));

      expect(syncSubscription).toHaveBeenCalledWith("cus_1", "sub_1");
    },
  );

  it("ignores a type it does not handle", async () => {
    await handleStripeEvent(event("invoice.paid", { id: "in_1" }));

    expect(syncSubscription).not.toHaveBeenCalled();
  });

  it("ignores a Checkout session that is not a subscription", async () => {
    await handleStripeEvent(checkoutEvent({ mode: "payment" }));

    expect(syncSubscription).not.toHaveBeenCalled();
  });

  it("ignores a Checkout session with no subscription", async () => {
    await handleStripeEvent(checkoutEvent({ subscription: null }));

    expect(syncSubscription).not.toHaveBeenCalled();
  });

  it("lets a failed sync throw, so the route answers 500 and Stripe retries", async () => {
    syncSubscription.mockRejectedValue(new Error("Stripe is down"));

    await expect(handleStripeEvent(checkoutEvent({}))).rejects.toThrow(
      "Stripe is down",
    );
  });
});
