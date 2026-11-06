import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isStripeCustomerMissing,
  isStripeNotFound,
  isStripeTestMode,
} from "@/lib/stripe";

function invalidRequest(code: string, param: string) {
  return new Stripe.errors.StripeInvalidRequestError({
    type: "invalid_request_error",
    message: "Stripe refused the request",
    code,
    param,
  });
}

// The params are the ones the Stripe sandbox answers with.
const MISSING_CUSTOMER = invalidRequest("resource_missing", "customer");
const MISSING_PRICE = invalidRequest(
  "resource_missing",
  "line_items[0][price]",
);
const OTHER_CODE = invalidRequest("parameter_invalid_empty", "customer");

describe("isStripeTestMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["sk_test_abc", "rk_test_abc"])("recognizes %s", (key) => {
    vi.stubEnv("STRIPE_SECRET_KEY", key);

    expect(isStripeTestMode()).toBe(true);
  });

  it("does not take a live key for a test key", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_abc");

    expect(isStripeTestMode()).toBe(false);
  });

  it("is off with no key", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", undefined);

    expect(isStripeTestMode()).toBe(false);
  });
});

describe("isStripeCustomerMissing", () => {
  it("recognizes a missing customer", () => {
    expect(isStripeCustomerMissing(MISSING_CUSTOMER)).toBe(true);
  });

  it("does not take a missing price for a dead customer", () => {
    expect(isStripeCustomerMissing(MISSING_PRICE)).toBe(false);
  });

  it("ignores another error code on the customer", () => {
    expect(isStripeCustomerMissing(OTHER_CODE)).toBe(false);
  });

  it("ignores an error that is not from Stripe", () => {
    expect(isStripeCustomerMissing(new Error("network"))).toBe(false);
  });
});

describe("isStripeNotFound", () => {
  it("recognizes any missing resource", () => {
    expect(isStripeNotFound(MISSING_CUSTOMER)).toBe(true);
    expect(isStripeNotFound(MISSING_PRICE)).toBe(true);
  });

  it("ignores another error code", () => {
    expect(isStripeNotFound(OTHER_CODE)).toBe(false);
  });
});
