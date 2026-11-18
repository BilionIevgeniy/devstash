import "server-only";

import { getUserProfile } from "@/features/auth/queries";
import { buildContractConfirmationEmail } from "@/features/billing/_internal/emails/contract-confirmation-email";
import type { SubscriptionConsent } from "@/features/billing/domain/subscription";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { logger } from "@/lib/observability/logger";
import { sendEmail } from "@/lib/vendors/email";

/** What the § 312f confirmation of one subscription is made from. */
export interface ContractConfirmationInput {
  userId: string;
  subscriptionId: string;
  startedAt: Date;
  consent: SubscriptionConsent;
  metadata: Record<string, string>;
}

async function deliver(input: ContractConfirmationInput): Promise<boolean> {
  const profile = await getUserProfile(input.userId);
  if (!profile) return true; // The account is gone: nobody to confirm to.

  const { metadata } = input;
  const email = buildContractConfirmationEmail({
    locale: isLocale(metadata.locale) ? metadata.locale : DEFAULT_LOCALE,
    period: metadata.plan === "yearly" ? "yearly" : "monthly",
    startedAt: input.startedAt,
    consent: input.consent,
  });
  const result = await sendEmail({
    to: profile.email,
    ...email,
    // A send repeated after a crash between the send and the mark sends
    // nothing twice: the payload is the same, so Resend answers the first.
    idempotencyKey: `contract-confirmation/${input.subscriptionId}`,
  });
  return result.success;
}

// The § 312f BGB confirmation (ADR 0032). The sync calls it inside its lock
// and marks the row only when this answers true, so a failure, a timeout or a
// frozen instance leaves the row unmarked and the next sync sends again.
export async function sendContractConfirmation(
  input: ContractConfirmationInput,
): Promise<boolean> {
  const { userId, subscriptionId } = input;
  try {
    if (await deliver(input)) return true;
  } catch (error) {
    await logger.error("Building the contract confirmation failed", {
      error,
      userId,
      subscriptionId,
    });
    return false;
  }
  await logger.error("The contract confirmation was not sent", {
    userId,
    subscriptionId,
  });
  return false;
}
