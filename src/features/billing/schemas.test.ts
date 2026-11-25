import { describe, expect, it } from "vitest";

import {
  cancellationDeclarationSchema,
  checkoutOrderSchema,
  ownCancellationSchema,
  checkoutSessionIdSchema,
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

describe("the limits of the cancellation forms", () => {
  it("wants a reason for a good-cause cancellation of one's own contract", () => {
    const result = ownCancellationSchema.safeParse({ kind: "extraordinary" });
    expect(result.error?.issues[0].message).toBe("cancellationReasonRequired");
    expect(ownCancellationSchema.safeParse({ kind: "ordinary" }).success).toBe(
      true,
    );
  });

  it.each([
    ["a reason", { reason: "x".repeat(2001) }],
    ["a name", { name: "x".repeat(201) }],
  ])("refuses %s over its limit", (_what, field) => {
    expect(
      cancellationDeclarationSchema.safeParse({
        kind: "extraordinary",
        reason: "x",
        name: "Ada",
        email: "ada@example.com",
        ...field,
      }).success,
    ).toBe(false);
  });

  it("takes a Checkout session id of up to 255 characters", () => {
    const id = (length: number) => "cs_".padEnd(length, "x");
    expect(checkoutSessionIdSchema.safeParse(id(255)).success).toBe(true);
    expect(checkoutSessionIdSchema.safeParse(id(256)).success).toBe(false);
  });
});
