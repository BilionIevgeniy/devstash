import "server-only";

import { sendContractConfirmation } from "@/features/billing/_internal/services/contract-confirmation";
import {
  consentFromMetadata,
  syncPlan,
  type SubscriptionSnapshot,
} from "@/features/billing/domain/subscription";
import {
  LOCKED_TRANSACTION,
  lockForTransaction,
} from "@/lib/postgres/advisory-lock";
import { logger } from "@/lib/observability/logger";
import { prisma } from "@/lib/postgres/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  getStripe,
  isStripeNotFound,
  type StripeRequestOptions,
  type StripeSubscription,
} from "@/lib/vendors/stripe";

/** What a sync did to the row of its customer; the daily job counts these. */
export type SyncOutcome = "unchanged" | "corrected" | "noRow";

const ROW_STATE = {
  userId: true,
  status: true,
  stripeSubscriptionId: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
  withdrawalWaiverAt: true,
  termsVersion: true,
  confirmedSubscriptionId: true,
} as const;

function toSnapshot(subscription: StripeSubscription): SubscriptionSnapshot {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return {
    id: subscription.id,
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    status: subscription.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    consent: consentFromMetadata(subscription.metadata),
  };
}

async function retrieveSubscription(
  id: string,
  request?: StripeRequestOptions,
) {
  try {
    return await getStripe().subscriptions.retrieve(id, undefined, request);
  } catch (error) {
    if (isStripeNotFound(error)) return null;
    throw error;
  }
}

// Marks the row once the confirmation of this subscription went out.
async function markConfirmed(
  tx: Prisma.TransactionClient,
  customerId: string,
  subscriptionId: string,
): Promise<void> {
  await tx.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { confirmedSubscriptionId: subscriptionId },
  });
}

// A subscription Stripe no longer has (test data cleared, a deleted object)
// ends the row that names it, like an ended status would, so a Pro row cannot
// outlive its subscription.
async function endMissing(
  tx: Prisma.TransactionClient,
  customerId: string,
  subscriptionId: string,
): Promise<SyncOutcome> {
  const { count } = await tx.subscription.updateMany({
    where: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    },
    data: {
      status: "canceled",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
    },
  });
  return count > 0 ? "corrected" : "unchanged";
}

// The read is inside the lock, so an older state can never commit last. Safe
// to run many times and at once: webhook retries, the return from Checkout and
// the daily reconciliation. The signed event, a checked session or the cron
// secret is the authority for this write, which is why it is scoped by the
// customer, not by userId (ADR 0012). The § 312f confirmation is sent inside
// the lock and only then marked, so it goes out at least once and, through
// Resend's idempotency key, not twice (ADR 0032).
async function syncInLock(
  customerId: string,
  subscriptionId: string,
  request?: StripeRequestOptions,
): Promise<SyncOutcome> {
  return prisma.$transaction(async (tx) => {
    await lockForTransaction(tx, `stripe-customer:${customerId}`);
    const subscription = await retrieveSubscription(subscriptionId, request);
    if (!subscription) return endMissing(tx, customerId, subscriptionId);

    const snapshot = toSnapshot(subscription);
    const row = await tx.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: ROW_STATE,
    });
    // No row: a deleted account or a customer that is not ours.
    if (!row) return "noRow";

    const plan = syncPlan(row, snapshot);
    if (plan.write) await tx.subscription.updateMany(plan.write);
    if (plan.confirm && snapshot.consent) {
      const sent = await sendContractConfirmation({
        userId: row.userId,
        subscriptionId: snapshot.id,
        startedAt: new Date(subscription.start_date * 1000),
        consent: snapshot.consent,
        metadata: subscription.metadata,
      });
      if (sent) await markConfirmed(tx, customerId, snapshot.id);
    }
    return plan.write ? "corrected" : "unchanged";
  }, LOCKED_TRANSACTION);
}

interface SyncOptions {
  /** No warning for a subscription with no row: the caller counts them. */
  quiet?: boolean;
  /** For a caller with a deadline of its own; else the SDK's defaults. */
  request?: StripeRequestOptions;
}

export async function syncSubscription(
  customerId: string,
  subscriptionId: string,
  { quiet = false, request }: SyncOptions = {},
): Promise<SyncOutcome> {
  const outcome = await syncInLock(customerId, subscriptionId, request);
  if (outcome === "noRow" && !quiet) {
    logger.warn("No row took a subscription", { customerId, subscriptionId });
  }
  return outcome;
}
