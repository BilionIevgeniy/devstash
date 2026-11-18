import { describe, expect, it } from "vitest";

import { contractStateFor } from "@/features/billing/domain/cancellation";

const PERIOD_END = new Date("2026-12-18T00:00:00.000Z");
const LIVE = {
  status: "active",
  cancelAtPeriodEnd: false,
  currentPeriodEnd: PERIOD_END,
  stripeSubscriptionId: "sub_1",
};

describe("contractStateFor", () => {
  it("offers a running contract with its renewal date", () => {
    expect(contractStateFor(LIVE)).toEqual({
      status: "live",
      periodEnd: PERIOD_END.toISOString(),
    });
  });

  it("says a contract set to end needs no second cancellation", () => {
    expect(contractStateFor({ ...LIVE, cancelAtPeriodEnd: true }).status).toBe(
      "cancelling",
    );
  });

  it("counts a past_due subscription as running: Stripe still collects", () => {
    expect(contractStateFor({ ...LIVE, status: "past_due" }).status).toBe(
      "live",
    );
  });

  it.each([
    ["no row", null],
    ["an ended subscription", { ...LIVE, status: "canceled" }],
    ["no subscription id", { ...LIVE, stripeSubscriptionId: null }],
  ])("finds no contract for %s", (_label, row) => {
    expect(contractStateFor(row)).toEqual({ status: "none", periodEnd: null });
  });
});
