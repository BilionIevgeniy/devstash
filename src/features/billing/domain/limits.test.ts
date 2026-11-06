import { describe, expect, it } from "vitest";

import {
  billingOverviewFor,
  entitlementsFor,
  isProStatus,
  proYearlyPricePerMonth,
  proYearlySavingsPercent,
  withinFreeCollectionLimit,
  withinFreeItemLimit,
} from "@/features/billing/domain/limits";

describe("yearly Pro pricing", () => {
  it("shows the yearly price as $6 a month", () => {
    expect(proYearlyPricePerMonth()).toBe(6);
  });

  it("saves 25% against paying monthly", () => {
    expect(proYearlySavingsPercent()).toBe(25);
  });
});

describe("entitlementsFor", () => {
  it.each(["active", "trialing", "past_due"])("grants Pro for %s", (status) => {
    expect(entitlementsFor(status).isPro).toBe(true);
  });

  it.each(["canceled", "incomplete", "incomplete_expired", "unpaid", "paused"])(
    "does not grant Pro for %s",
    (status) => {
      expect(entitlementsFor(status).isPro).toBe(false);
    },
  );

  it("agrees with isProStatus", () => {
    expect(isProStatus("past_due")).toBe(true);
    expect(isProStatus("canceled")).toBe(false);
  });

  it("puts a user without a subscription on the Free plan", () => {
    expect(entitlementsFor(null).isPro).toBe(false);
  });
});

describe("Free limits", () => {
  it("allows the 50th item and refuses the 51st", () => {
    expect(withinFreeItemLimit(49)).toBe(true);
    expect(withinFreeItemLimit(50)).toBe(false);
  });

  it("allows the 3rd collection and refuses the 4th", () => {
    expect(withinFreeCollectionLimit(2)).toBe(true);
    expect(withinFreeCollectionLimit(3)).toBe(false);
  });
});

describe("billingOverviewFor", () => {
  it("puts a user with no row on Free, with no billing account", () => {
    expect(billingOverviewFor(null)).toEqual({
      isPro: false,
      hasBillingAccount: false,
      paymentIssue: false,
    });
  });

  it("gives the demo row Pro without a billing account", () => {
    const overview = billingOverviewFor({
      status: "active",
      stripeCustomerId: null,
    });

    expect(overview).toEqual({
      isPro: true,
      hasBillingAccount: false,
      paymentIssue: false,
    });
  });

  it("keeps Pro and reports a payment issue for past_due", () => {
    const overview = billingOverviewFor({
      status: "past_due",
      stripeCustomerId: "cus_1",
    });

    expect(overview).toEqual({
      isPro: true,
      hasBillingAccount: true,
      paymentIssue: true,
    });
  });
});
