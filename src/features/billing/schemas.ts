import { z } from "zod";

export const planSchema = z.enum(["monthly", "yearly"]);
export type Plan = z.infer<typeof planSchema>;

export const checkoutSessionIdSchema = z.string().startsWith("cs_").max(255);

// The order step (ADR 0032): an order is refused unless the terms and the
// § 356 (5) BGB consent were both ticked.
export const checkoutOrderSchema = z.object({
  plan: planSchema,
  acceptTerms: z.literal(true, { error: "orderConsentRequired" }),
  waiveWithdrawal: z.literal(true, { error: "orderConsentRequired" }),
});
export type CheckoutOrderInput = z.infer<typeof checkoutOrderSchema>;
