import { describe, expect, it } from "vitest";

import {
  CHECKOUT_SESSION_LIFETIME_MS,
  checkoutSessionParams,
  planOpenSessions,
  type CheckoutSessionInput,
} from "@/features/billing/domain/checkout-session";

const NOW = new Date("2026-11-18T10:00:00.000Z");

const INPUT: CheckoutSessionInput = {
  customer: "cus_1",
  priceId: "price_monthly",
  plan: "monthly",
  userId: "user-1",
  locale: "de",
  origin: "https://devstash.test",
  consent: {
    withdrawalWaiverAt: new Date("2026-11-18T09:59:30.000Z"),
    termsVersion: "2026-11-18",
  },
  submitNote: "Mit Klick auf Zahlen bestellst du zahlungspflichtig.",
  now: NOW,
};

describe("checkoutSessionParams", () => {
  const params = checkoutSessionParams(INPUT);

  it("records the consent on the session and on its subscription", () => {
    const metadata = {
      userId: "user-1",
      locale: "de",
      plan: "monthly",
      termsVersion: "2026-11-18",
      withdrawalWaiverAt: "2026-11-18T09:59:30.000Z",
    };
    expect(params.metadata).toEqual(metadata);
    expect(params.subscription_data).toEqual({ metadata });
  });

  it("collects tax and takes cards only", () => {
    expect(params.automatic_tax).toEqual({ enabled: true });
    expect(params.tax_id_collection).toEqual({ enabled: true });
    expect(params.billing_address_collection).toBe("required");
    expect(params.customer_update).toEqual({ address: "auto", name: "auto" });
    expect(params.payment_method_types).toEqual(["card"]);
  });

  it("labels the button as a payment and puts the note next to it", () => {
    expect(params.submit_type).toBe("pay");
    expect(params.custom_text).toEqual({
      submit: { message: INPUT.submitNote },
    });
  });

  it("expires well past Stripe's 30 minute minimum", () => {
    expect(CHECKOUT_SESSION_LIFETIME_MS).toBeGreaterThanOrEqual(35 * 60_000);
    expect(params.expires_at).toBe(
      (NOW.getTime() + CHECKOUT_SESSION_LIFETIME_MS) / 1000,
    );
  });

  it("opens Stripe's page in the locale of the order, English otherwise", () => {
    expect(params.locale).toBe("de");
    expect(checkoutSessionParams({ ...INPUT, locale: "fr" }).locale).toBe("en");
  });

  it("returns to the settings with the session id", () => {
    expect(params.success_url).toBe(
      "https://devstash.test/settings?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(params.cancel_url).toBe("https://devstash.test/settings");
  });
});

describe("planOpenSessions", () => {
  const session = (id: string, plan: string, termsVersion = "2026-11-18") => ({
    id,
    url: `https://checkout.test/${id}`,
    metadata: { plan, termsVersion },
  });

  it("reuses an open session for the same plan and terms", () => {
    const result = planOpenSessions(
      [session("cs_1", "monthly"), session("cs_2", "yearly")],
      "monthly",
      "2026-11-18",
    );
    expect(result.reuse?.id).toBe("cs_1");
    expect(result.expire).toEqual(["cs_2"]);
  });

  it("expires a session of older terms", () => {
    const result = planOpenSessions(
      [session("cs_1", "monthly", "2026-01-01")],
      "monthly",
      "2026-11-18",
    );
    expect(result).toEqual({ reuse: null, expire: ["cs_1"] });
  });

  it("does nothing when no session is open", () => {
    expect(planOpenSessions([], "monthly", "2026-11-18")).toEqual({
      reuse: null,
      expire: [],
    });
  });
});
