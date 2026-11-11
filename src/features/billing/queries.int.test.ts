import { beforeAll, describe, expect, it } from "vitest";
import { seedTenants, type Tenants } from "../../../test/integration/fixtures";
import { getStripeCustomerId } from "@/features/billing/_internal/queries";
import {
  getBillingOverview,
  getEntitlements,
} from "@/features/billing/queries";

// The plan is read by userId from Subscription: A (no row) is Free while B is
// Pro, and neither sees the other's customer.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("getEntitlements and getBillingOverview", () => {
  it("read each user's own plan", async () => {
    await expect(getEntitlements(t.a.userId)).resolves.toEqual({
      isPro: false,
    });
    await expect(getEntitlements(t.b.userId)).resolves.toEqual({ isPro: true });
    await expect(getBillingOverview(t.a.userId)).resolves.toMatchObject({
      isPro: false,
      hasBillingAccount: false,
    });
    await expect(getBillingOverview(t.b.userId)).resolves.toMatchObject({
      isPro: true,
      hasBillingAccount: true,
    });
  });
});

describe("getStripeCustomerId", () => {
  it("returns the caller's customer only", async () => {
    await expect(getStripeCustomerId(t.b.userId)).resolves.toBe("cus_test_pro");
    await expect(getStripeCustomerId(t.a.userId)).resolves.toBeNull();
  });
});
