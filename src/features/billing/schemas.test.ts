import { describe, expect, it } from "vitest";

import { checkoutOrderSchema } from "@/features/billing/schemas";

const ORDER = { plan: "monthly", acceptTerms: true, waiveWithdrawal: true };

describe("checkoutOrderSchema", () => {
  it("takes an order with both consents", () => {
    expect(checkoutOrderSchema.parse(ORDER)).toEqual(ORDER);
  });

  it.each(["acceptTerms", "waiveWithdrawal"])(
    "refuses an order without %s",
    (field) => {
      const result = checkoutOrderSchema.safeParse({
        ...ORDER,
        [field]: false,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("orderConsentRequired");
    },
  );

  it("refuses an unknown plan", () => {
    expect(
      checkoutOrderSchema.safeParse({ ...ORDER, plan: "weekly" }).success,
    ).toBe(false);
  });
});
