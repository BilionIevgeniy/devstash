import { describe, expect, it } from "vitest";

import {
  stripeIdOf,
  subscriptionWrite,
} from "@/features/billing/domain/subscription";

const PERIOD_END = new Date("2026-12-01T00:00:00Z");

function snapshot(status: string) {
  return {
    id: "sub_1",
    customerId: "cus_1",
    status,
    currentPeriodEnd: PERIOD_END,
  };
}

describe("subscriptionWrite", () => {
  it.each(["active", "trialing", "past_due"])(
    "lets a live %s subscription take the row by customer",
    (status) => {
      expect(subscriptionWrite(snapshot(status))).toEqual({
        where: { stripeCustomerId: "cus_1" },
        data: {
          status,
          stripeSubscriptionId: "sub_1",
          currentPeriodEnd: PERIOD_END,
        },
      });
    },
  );

  it.each(["incomplete", "unpaid", "paused"])(
    "writes %s only over its own id and keeps the id",
    (status) => {
      expect(subscriptionWrite(snapshot(status))).toEqual({
        where: { stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" },
        data: {
          status,
          stripeSubscriptionId: "sub_1",
          currentPeriodEnd: PERIOD_END,
        },
      });
    },
  );

  it.each(["canceled", "incomplete_expired"])(
    "writes %s only over its own id and clears the id",
    (status) => {
      expect(subscriptionWrite(snapshot(status))).toEqual({
        where: { stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" },
        data: {
          status,
          stripeSubscriptionId: null,
          currentPeriodEnd: PERIOD_END,
        },
      });
    },
  );

  it("cannot reach a row that holds a newer subscription when an old one ends", () => {
    const { where } = subscriptionWrite({
      ...snapshot("canceled"),
      id: "sub_old",
    });

    expect(where.stripeSubscriptionId).toBe("sub_old");
  });
});

describe("stripeIdOf", () => {
  it("takes an id as it is", () => {
    expect(stripeIdOf("cus_1")).toBe("cus_1");
  });

  it("reads the id of an expanded object", () => {
    expect(stripeIdOf({ id: "cus_1" })).toBe("cus_1");
  });

  it("answers null when there is no reference", () => {
    expect(stripeIdOf(null)).toBeNull();
  });
});
