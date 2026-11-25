import { describe, expect, it } from "vitest";

import {
  consentFromMetadata,
  liveSubscriptionCheck,
  stripeIdOf,
  subscriptionWrite,
  syncPlan,
  type SubscriptionRowState,
} from "@/features/billing/domain/subscription";

const PERIOD_END = new Date("2026-12-01T00:00:00Z");

function snapshot(status: string) {
  return {
    id: "sub_1",
    customerId: "cus_1",
    status,
    currentPeriodEnd: PERIOD_END,
    cancelAtPeriodEnd: false,
    consent: null,
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
          cancelAtPeriodEnd: false,
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
          cancelAtPeriodEnd: false,
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
          cancelAtPeriodEnd: false,
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

const WAIVER = new Date("2026-11-18T09:00:00Z");
const CONSENT = { withdrawalWaiverAt: WAIVER, termsVersion: "2026-11-18" };

function row(
  overrides: Partial<SubscriptionRowState> = {},
): SubscriptionRowState {
  return {
    status: "active",
    stripeSubscriptionId: "sub_1",
    currentPeriodEnd: PERIOD_END,
    cancelAtPeriodEnd: false,
    withdrawalWaiverAt: WAIVER,
    termsVersion: "2026-11-18",
    confirmedSubscriptionId: "sub_1",
    ...overrides,
  };
}

describe("syncPlan", () => {
  const live = { ...snapshot("active"), consent: CONSENT };

  it("writes nothing when the row already says what Stripe says", () => {
    expect(syncPlan(row(), live)).toEqual({ write: null, confirm: false });
  });

  it("writes a changed status, period end or cancellation", () => {
    expect(syncPlan(row({ status: "past_due" }), live).write).not.toBeNull();
    expect(
      syncPlan(row({ currentPeriodEnd: new Date("2026-11-01") }), live).write,
    ).not.toBeNull();
    expect(
      syncPlan(row(), { ...live, cancelAtPeriodEnd: true }).write?.data
        .cancelAtPeriodEnd,
    ).toBe(true);
  });

  it("copies the consent onto the row", () => {
    const plan = syncPlan(
      row({ withdrawalWaiverAt: null, termsVersion: null }),
      live,
    );
    expect(plan.write?.data).toMatchObject(CONSENT);
  });

  it("confirms a live subscription with consent once", () => {
    expect(syncPlan(row({ confirmedSubscriptionId: null }), live).confirm).toBe(
      true,
    );
    expect(
      syncPlan(row({ confirmedSubscriptionId: "sub_old" }), live).confirm,
    ).toBe(true);
    expect(syncPlan(row(), live).confirm).toBe(false);
  });

  it("never confirms a subscription without consent: no metadata, no send", () => {
    expect(
      syncPlan(row({ confirmedSubscriptionId: null }), snapshot("active"))
        .confirm,
    ).toBe(false);
  });

  it("never confirms a subscription that is not live", () => {
    expect(
      syncPlan(row({ confirmedSubscriptionId: null, status: "incomplete" }), {
        ...snapshot("incomplete"),
        consent: CONSENT,
      }).confirm,
    ).toBe(false);
  });

  it("leaves a row that holds a newer subscription alone", () => {
    expect(
      syncPlan(row({ stripeSubscriptionId: "sub_new" }), snapshot("canceled")),
    ).toEqual({ write: null, confirm: false });
  });
});

describe("consentFromMetadata", () => {
  it("reads the consent the order step stored", () => {
    expect(
      consentFromMetadata({
        termsVersion: "2026-11-18",
        withdrawalWaiverAt: WAIVER.toISOString(),
      }),
    ).toEqual(CONSENT);
  });

  it.each([
    [{}],
    [{ termsVersion: "2026-11-18" }],
    [{ termsVersion: "2026-11-18", withdrawalWaiverAt: "not a date" }],
  ])("answers null for incomplete metadata %j", (metadata) => {
    expect(consentFromMetadata(metadata)).toBeNull();
  });
});

describe("liveSubscriptionCheck", () => {
  const row = (subscriptionId: string | null, status: string) => ({
    subscriptionId,
    status,
  });

  it("syncs a live subscription its row does not name", () => {
    expect(
      liveSubscriptionCheck(
        { id: "sub_2", status: "active" },
        row(null, "canceled"),
      ),
    ).toBe("sync");
    expect(
      liveSubscriptionCheck(
        { id: "sub_2", status: "active" },
        row("sub_1", "incomplete"),
      ),
    ).toBe("sync");
  });

  it("skips one the row names, or one that is not live", () => {
    expect(
      liveSubscriptionCheck(
        { id: "sub_1", status: "active" },
        row("sub_1", "active"),
      ),
    ).toBe("skip");
    expect(
      liveSubscriptionCheck(
        { id: "sub_1", status: "incomplete" },
        row(null, "canceled"),
      ),
    ).toBe("skip");
  });

  it("reports a live subscription of a customer with no row", () => {
    expect(
      liveSubscriptionCheck({ id: "sub_1", status: "active" }, undefined),
    ).toBe("noRow");
  });

  it("flags a second live subscription instead of flipping the row", () => {
    expect(
      liveSubscriptionCheck(
        { id: "sub_2", status: "active" },
        row("sub_1", "past_due"),
      ),
    ).toBe("duplicate");
  });
});

describe("the consent of a subscription", () => {
  it("is none when either part is missing", () => {
    const date = "2026-11-18T09:00:00.000Z";
    expect(consentFromMetadata({ termsVersion: "v1" })).toBeNull();
    expect(consentFromMetadata({ withdrawalWaiverAt: date })).toBeNull();
    expect(
      consentFromMetadata({ termsVersion: "v1", withdrawalWaiverAt: date }),
    ).toEqual({ termsVersion: "v1", withdrawalWaiverAt: new Date(date) });
  });

  it("is written again only when the row holds another", () => {
    const withdrawalWaiverAt = new Date("2026-11-18T09:00:00Z");
    const consent = { termsVersion: "v1", withdrawalWaiverAt };
    const row: SubscriptionRowState = {
      status: "active",
      stripeSubscriptionId: "sub_1",
      currentPeriodEnd: PERIOD_END,
      cancelAtPeriodEnd: false,
      confirmedSubscriptionId: "sub_1",
      ...consent,
    };
    const plan = (patch: Partial<SubscriptionRowState>) =>
      syncPlan({ ...row, ...patch }, { ...snapshot("active"), consent }).write;
    expect(plan({})).toBeNull();
    expect(plan({ termsVersion: "v0" })).not.toBeNull();
    expect(plan({ withdrawalWaiverAt: new Date(0) })).not.toBeNull();
    expect(
      syncPlan({ ...row, ...consent }, snapshot("active")).write,
    ).toBeNull();
  });
});
