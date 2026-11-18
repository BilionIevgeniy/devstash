import { describe, expect, it } from "vitest";

import {
  cancellationDeclarationSchema,
  checkoutOrderSchema,
  ownCancellationSchema,
} from "@/features/billing/schemas";

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

describe("cancellationDeclarationSchema", () => {
  const DECLARATION = {
    name: " Ada Lovelace ",
    email: " Ada@Example.com ",
    kind: "ordinary",
  };

  it("normalises the email like registration does", () => {
    const parsed = cancellationDeclarationSchema.parse(DECLARATION);
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.name).toBe("Ada Lovelace");
  });

  it("asks for the reason of a cancellation for good cause", () => {
    const result = cancellationDeclarationSchema.safeParse({
      ...DECLARATION,
      kind: "extraordinary",
      reason: "  ",
    });
    expect(result.error?.issues[0].message).toBe("cancellationReasonRequired");
  });

  it("asks for a name", () => {
    const result = cancellationDeclarationSchema.safeParse({
      ...DECLARATION,
      name: " ",
    });
    expect(result.error?.issues[0].message).toBe("cancellationNameRequired");
  });
});

describe("ownCancellationSchema", () => {
  it("takes an ordinary cancellation without a reason", () => {
    expect(ownCancellationSchema.parse({ kind: "ordinary" })).toEqual({
      kind: "ordinary",
    });
  });

  it("refuses an unknown kind", () => {
    expect(ownCancellationSchema.safeParse({ kind: "later" }).success).toBe(
      false,
    );
  });
});
