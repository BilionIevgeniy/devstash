import { describe, expect, it } from "vitest";

import { entitlementsFor, isProStatus } from "@/features/billing/domain/limits";

describe("entitlementsFor", () => {
  it.each(["active", "trialing"])("grants Pro for %s", (status) => {
    expect(entitlementsFor(status).isPro).toBe(true);
  });

  it.each(["past_due", "canceled", "incomplete", "unpaid"])(
    "does not grant Pro for %s",
    (status) => {
      expect(entitlementsFor(status).isPro).toBe(false);
    },
  );

  it("agrees with isProStatus", () => {
    expect(isProStatus("active")).toBe(true);
    expect(isProStatus("past_due")).toBe(false);
  });

  it("puts a user without a subscription on the Free plan", () => {
    expect(entitlementsFor(null).isPro).toBe(false);
  });
});
