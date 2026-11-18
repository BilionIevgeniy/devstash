import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../../test/integration/snapshot";
import { syncSubscription } from "@/features/billing/_internal/services/subscription-sync";
import { prisma } from "@/lib/postgres/prisma";
import { getStripe } from "@/lib/vendors/stripe";

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

function stripeSubscription(status: string, metadata = {}) {
  const retrieve = vi.fn(async () => ({
    id: "sub_test_pro",
    customer: "cus_test_pro",
    status,
    cancel_at_period_end: false,
    start_date: 1_790_000_000,
    metadata,
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

  it("claims the confirmation on the customer's row only", async () => {
    stripeSubscription("active", {
      locale: "en",
      plan: "monthly",
      termsVersion: "2026-11-18",
      withdrawalWaiverAt: "2026-11-18T09:00:00.000Z",
    });
    const before = await snapshotTenant(t.a.userId);

    await syncSubscription("cus_test_pro", "sub_test_pro");

    const b = await prisma.subscription.findUniqueOrThrow({
      where: { userId: t.b.userId },
    });
    expect(b.confirmedSubscriptionId).toBe("sub_test_pro");
    expect(b.termsVersion).toBe("2026-11-18");
    expect(await snapshotTenant(t.a.userId)).toEqual(before);
  });
});
