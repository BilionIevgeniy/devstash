import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import { reconcileSubscriptions } from "@/features/billing/services/reconciliation";
import { prisma } from "@/lib/postgres/prisma";
import { getStripe } from "@/lib/vendors/stripe";

// The reconciliation reads every row, but writes each only through the sync of
// its own customer: A's stale row is corrected, B's right row stays as it is.
let t: Tenants;
let listMock: ReturnType<typeof vi.fn>;

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
  // Stripe counts in whole seconds: B's row holds what Stripe reports.
  const b = await prisma.subscription.update({
    where: { userId: t.b.userId },
    data: { currentPeriodEnd: new Date(1_800_000_000_000) },
  });
  const states: Record<string, object> = {
    sub_test_a: { customer: "cus_test_a", status: "canceled" },
    sub_test_pro: {
      customer: "cus_test_pro",
      status: "active",
      items: {
        data: [
          {
            current_period_end: Math.floor(
              (b.currentPeriodEnd?.getTime() ?? 0) / 1000,
            ),
          },
        ],
      },
    },
  };
  const retrieve = vi.fn(async (id: string) => ({
    id,
    cancel_at_period_end: false,
    start_date: 1_790_000_000,
    metadata: {},
    items: { data: [] },
    ...states[id],
  }));
  const list = vi.fn(async (): Promise<object> => ({
    data: [],
    has_more: false,
  }));
  listMock = list;
  vi.mocked(getStripe).mockReturnValue({
    subscriptions: { retrieve, list },
  } as unknown as ReturnType<typeof getStripe>);
});

describe("reconcileSubscriptions", () => {
  it("corrects the stale row of its customer and no other", async () => {
    const before = await snapshotTenant(t.b.userId);

    const report = await reconcileSubscriptions({
      now: new Date(),
      deadline: Date.now() + 60_000,
    });

    const a = await prisma.subscription.findUniqueOrThrow({
      where: { userId: t.a.userId },
    });
    expect(a.status).toBe("canceled");
    expect(a.stripeSubscriptionId).toBeNull();
    expect(report.counts).toEqual({
      checked: 2,
      corrected: 1,
      missingRow: 0,
      duplicate: 0,
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  it("never flips a row to a second live subscription of its customer", async () => {
    listMock.mockResolvedValue({
      data: [{ id: "sub_second", customer: "cus_test_pro", status: "active" }],
      has_more: false,
    });
    const before = await snapshotTenant(t.b.userId);

    const report = await reconcileSubscriptions({
      now: new Date(),
      deadline: Date.now() + 60_000,
    });

    expect(report.counts.duplicate).toBe(1);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});
