import { z } from "zod";

import { emailSchema } from "@/features/auth/schemas";
import {
  CANCELLATION_KINDS,
  CANCELLATION_NAME_MAX,
  CANCELLATION_REASON_MAX,
} from "@/features/billing/domain/cancellation";

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
const cancellationFields = {
  kind: z.enum(CANCELLATION_KINDS),
  reason: z.string().trim().max(CANCELLATION_REASON_MAX).optional(),
};

// § 312k (2) BGB: a cancellation for good cause states its reason.
function requireReason(
  value: { kind: string; reason?: string },
  context: z.RefinementCtx,
) {
  if (value.kind === "extraordinary" && !value.reason) {
    context.addIssue({
      code: "custom",
      path: ["reason"],
      message: "cancellationReasonRequired",
    });
  }
}

/** The cancellation of a signed-in user: the contract is known from the session. */
export const ownCancellationSchema = z
  .object(cancellationFields)
  .superRefine(requireReason);
export type OwnCancellationInput = z.infer<typeof ownCancellationSchema>;

/** The signed-out form: the consumer identifies the contract by name and email. */
export const cancellationDeclarationSchema = z
  .object({
    ...cancellationFields,
    name: z
      .string()
      .trim()
      .min(1, "cancellationNameRequired")
      .max(CANCELLATION_NAME_MAX),
    email: emailSchema,
  })
  .superRefine(requireReason);
export type CancellationDeclarationInput = z.infer<
  typeof cancellationDeclarationSchema
>;
