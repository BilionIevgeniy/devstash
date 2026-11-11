import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../../test/integration/snapshot";
import { syncSubscription } from "@/features/billing/_internal/services/subscription-sync";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// The Stripe sync is the one write not scoped by userId: the customer id from
// Stripe picks the row (ADR 0012). An update for B's customer must reach B's
// row and no other.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
  await prisma.subscription.create({
    data: {
      userId: t.a.userId,
      status: "active",
      stripeCustomerId: "cus_test_a",
      stripeSubscriptionId: "sub_test_a",
    },
  });
});

function stripeSubscription(status: string) {
  const retrieve = vi.fn(async () => ({
    id: "sub_test_pro",
    customer: "cus_test_pro",
    status,
    items: { data: [] },
  }));
  vi.mocked(getStripe).mockReturnValue({
    subscriptions: { retrieve },
  } as unknown as ReturnType<typeof getStripe>);
}

describe("syncSubscription", () => {
  it("writes the customer's row and leaves the other user's alone", async () => {
    stripeSubscription("canceled");
    const before = await snapshotTenant(t.a.userId);

    await syncSubscription("cus_test_pro", "sub_test_pro");

    const b = await prisma.subscription.findUniqueOrThrow({
      where: { userId: t.b.userId },
    });
    expect(b.status).toBe("canceled");
    expect(await snapshotTenant(t.a.userId)).toEqual(before);
  });
});
