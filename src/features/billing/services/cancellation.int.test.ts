import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import { getUserIdByEmail } from "@/features/auth/queries";
import { getContractState } from "@/features/billing/queries";
import {
  cancelOwnSubscription,
  processCancellationDeclaration,
} from "@/features/billing/services/cancellation";
import { getStripe } from "@/lib/vendors/stripe";

// Stripe is mocked; the rows are real. A cancellation picks its subscription
// from the caller's own row (signed in) or the account of the given email
// (signed out), and must never reach another user's.
let t: Tenants;
const NOW = new Date("2026-11-18T10:00:00.000Z");

beforeEach(async () => {
  t = await seedTenants();
});

function stripeWith() {
  const update = vi.fn(async () => ({}));
  const retrieve = vi.fn(async (id: string) => ({
    id,
    customer: "cus_test_pro",
    status: "active",
    cancel_at_period_end: true,
    start_date: 1_790_000_000,
    metadata: {},
    items: { data: [] },
  }));
  vi.mocked(getStripe).mockReturnValue({
    subscriptions: { update, retrieve },
  } as unknown as ReturnType<typeof getStripe>);
  return { update };
}

describe("cancelOwnSubscription", () => {
  it("cancels B's own subscription and marks B's row", async () => {
    const { update } = stripeWith();

    const result = await cancelOwnSubscription(
      t.b.userId,
      { kind: "ordinary" },
      "en",
      NOW,
    );

    expect(result.success).toBe(true);
    expect(update).toHaveBeenCalledWith("sub_test_pro", {
      cancel_at_period_end: true,
    });
    expect((await getContractState(t.b.userId)).status).toBe("cancelling");
  });

  it("never reaches B's subscription for A", async () => {
    const { update } = stripeWith();
    const before = await snapshotTenant(t.b.userId);

    const result = await cancelOwnSubscription(
      t.a.userId,
      { kind: "ordinary" },
      "en",
      NOW,
    );

    expect(result.error).toBe("noLiveContract");
    expect(update).not.toHaveBeenCalled();
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

describe("processCancellationDeclaration", () => {
  it("cancels only the subscription of the given address", async () => {
    const { update } = stripeWith();
    const before = await snapshotTenant(t.b.userId);

    await processCancellationDeclaration(
      { name: "A", email: t.a.email, kind: "ordinary" },
      "en",
      NOW,
    );

    expect(update).not.toHaveBeenCalled();
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

describe("getUserIdByEmail", () => {
  it("finds the account of the address and no other", async () => {
    expect(await getUserIdByEmail(t.b.email)).toBe(t.b.userId);
    expect(await getUserIdByEmail(t.a.email)).toBe(t.a.userId);
    expect(await getUserIdByEmail("nobody@example.com")).toBeNull();
  });
});
