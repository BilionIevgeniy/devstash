import { describe, expect, it } from "vitest";

import {
  billingOverviewFor,
  entitlementsFor,
  isProStatus,
  proPriceDisplay,
  proYearlyPricePerMonth,
  proYearlySavingsPercent,
  FREE_ITEM_LIMIT,
  reachedFreeLimit,
  textEditsAllowed,
  withinFreeCollectionLimit,
  withinFreeItemLimit,
  FREE_COLLECTION_LIMIT,
  planFeatureCount,
} from "@/features/billing/domain/limits";

describe("yearly Pro pricing", () => {
  it("shows the yearly price as $6 a month", () => {
    expect(proYearlyPricePerMonth()).toBe(6);
  });

  it("saves 25% against paying monthly", () => {
    expect(proYearlySavingsPercent()).toBe(25);
  });
});

describe("proPriceDisplay", () => {
  it("shows the monthly price", () => {
    expect(proPriceDisplay(false)).toEqual({ perMonth: 8, yearlyTotal: null });
  });

  it("shows the yearly price per month, with the yearly total", () => {
    expect(proPriceDisplay(true)).toEqual({ perMonth: 6, yearlyTotal: 72 });
  });
});

describe("reachedFreeLimit", () => {
  it.each([
    [49, 2, false],
    [50, 2, true],
    [49, 3, true],
    [60, 5, true],
  ])("%i items and %i collections: %s", (items, collections, expected) => {
    expect(reachedFreeLimit(items, collections)).toBe(expected);
  });
});

const PERIOD_END = new Date("2026-12-01T00:00:00Z");

describe("entitlementsFor", () => {
  it.each(["active", "trialing", "past_due"])("grants Pro for %s", (status) => {
    expect(entitlementsFor({ status, currentPeriodEnd: PERIOD_END })).toEqual({
      isPro: true,
      canExport: true,
    });
  });

  it.each(["canceled", "unpaid", "paused"])(
    "keeps the export for a Pro that ended (%s)",
    (status) => {
      expect(entitlementsFor({ status, currentPeriodEnd: PERIOD_END })).toEqual(
        { isPro: false, canExport: true },
      );
    },
  );

  it.each(["incomplete", "incomplete_expired"])(
    "gives no export for a subscription never paid (%s)",
    (status) => {
      expect(
        entitlementsFor({ status, currentPeriodEnd: PERIOD_END }).canExport,
      ).toBe(false);
    },
  );

  it("gives no export for a row that never had a period", () => {
    expect(
      entitlementsFor({ status: "canceled", currentPeriodEnd: null }).canExport,
    ).toBe(false);
  });

  it.each(["canceled", "incomplete", "incomplete_expired", "unpaid", "paused"])(
    "does not grant Pro for %s",
    (status) => {
      expect(
        entitlementsFor({ status, currentPeriodEnd: PERIOD_END }).isPro,
      ).toBe(false);
    },
  );

  it("agrees with isProStatus", () => {
    expect(isProStatus("past_due")).toBe(true);
    expect(isProStatus("canceled")).toBe(false);
  });

  it("puts a user without a subscription on the Free plan", () => {
    expect(entitlementsFor(null)).toEqual({ isPro: false, canExport: false });
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

describe("textEditsAllowed", () => {
  it("keeps text editing open for Pro and for Free at or under the limit", () => {
    expect(textEditsAllowed(true, 500)).toBe(true);
    expect(textEditsAllowed(false, FREE_ITEM_LIMIT)).toBe(true);
    expect(textEditsAllowed(false, 3)).toBe(true);
  });

  it("closes it for Free over the limit", () => {
    expect(textEditsAllowed(false, FREE_ITEM_LIMIT + 1)).toBe(false);
  });
});

describe("planFeatureCount", () => {
  it("counts the two lines with a limit, and no other", () => {
    expect(planFeatureCount("items")).toBe(FREE_ITEM_LIMIT);
    expect(planFeatureCount("collections")).toBe(FREE_COLLECTION_LIMIT);
    expect(planFeatureCount("aiTags")).toBeUndefined();
  });
});
