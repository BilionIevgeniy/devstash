import "server-only";

import { getUserProfile } from "@/features/auth/queries";
import { buildContractConfirmationEmail } from "@/features/billing/_internal/emails/contract-confirmation-email";
import type { SubscriptionConsent } from "@/features/billing/domain/subscription";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { logger } from "@/lib/observability/logger";
import { prisma } from "@/lib/postgres/prisma";
import { sendEmail } from "@/lib/vendors/email";

/** A confirmation the sync claimed on the row, to send after its commit. */
export interface ClaimedConfirmation {
  userId: string;
  subscriptionId: string;
  startedAt: Date;
  consent: SubscriptionConsent;
  metadata: Record<string, string>;
}

// Gives the claim back, so the next webhook or the daily reconciliation sends
// again. Only while the row still holds this claim.
async function releaseClaim(userId: string, subscriptionId: string) {
  await prisma.subscription.updateMany({
    where: { userId, confirmedSubscriptionId: subscriptionId },
    data: { confirmedSubscriptionId: null },
  });
}

async function deliver(claimed: ClaimedConfirmation): Promise<boolean> {
  const profile = await getUserProfile(claimed.userId);
  if (!profile) return true; // The account is gone: nobody to confirm to.

  const { metadata } = claimed;
  const email = buildContractConfirmationEmail({
    locale: isLocale(metadata.locale) ? metadata.locale : DEFAULT_LOCALE,
    period: metadata.plan === "yearly" ? "yearly" : "monthly",
    startedAt: claimed.startedAt,
    consent: claimed.consent,
  });
  const result = await sendEmail({
    to: profile.email,
    ...email,
    // A retry after a timeout that did deliver sends nothing twice.
    idempotencyKey: `contract-confirmation/${claimed.subscriptionId}`,
  });
  return result.success;
}

// The § 312f BGB confirmation (ADR 0032), sent once per subscription: the sync
// claimed it on the row in its transaction. A failure releases the claim.
export async function sendContractConfirmation(
  claimed: ClaimedConfirmation,
): Promise<void> {
  const { userId, subscriptionId } = claimed;
  let sent = false;
  try {
    sent = await deliver(claimed);
  } catch (error) {
    await logger.error("Building the contract confirmation failed", {
      error,
      userId,
      subscriptionId,
    });
  }
  if (sent) return;

  await logger.error("The contract confirmation was not sent", {
    userId,
    subscriptionId,
  });
  await releaseClaim(userId, subscriptionId);
}
