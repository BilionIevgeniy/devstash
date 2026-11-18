import "server-only";

import {
  sendContractConfirmation,
  type ClaimedConfirmation,
} from "@/features/billing/_internal/services/contract-confirmation";
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

async function retrieveSubscription(id: string) {
  try {
    return await getStripe().subscriptions.retrieve(id);
  } catch (error) {
    if (isStripeNotFound(error)) return null;
    throw error;
  }
}

// One row claims a confirmation once per subscription; count 1 means this
// sync won the claim and sends.
async function claimConfirmation(
  tx: Prisma.TransactionClient,
  customerId: string,
  subscriptionId: string,
): Promise<boolean> {
  const { count } = await tx.subscription.updateMany({
    where: {
      stripeCustomerId: customerId,
      OR: [
        { confirmedSubscriptionId: null },
        { confirmedSubscriptionId: { not: subscriptionId } },
      ],
    },
    data: { confirmedSubscriptionId: subscriptionId },
  });
  return count === 1;
}

interface SyncResult {
  outcome: SyncOutcome;
  claimed: ClaimedConfirmation | null;
}

// The read is inside the lock, so an older state can never commit last. Safe
// to run many times and at once: webhook retries, the return from Checkout and
// the daily reconciliation. The signed event, a checked session or the cron
// secret is the authority for this write, which is why it is scoped by the
// customer, not by userId (ADR 0012).
async function syncInLock(
  customerId: string,
  subscriptionId: string,
): Promise<SyncResult> {
  return prisma.$transaction(async (tx) => {
    await lockForTransaction(tx, `stripe-customer:${customerId}`);
    const subscription = await retrieveSubscription(subscriptionId);
    if (!subscription) return { outcome: "unchanged", claimed: null };

    const snapshot = toSnapshot(subscription);
    const row = await tx.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: ROW_STATE,
    });
    // No row: a deleted account or a customer that is not ours.
    if (!row) return { outcome: "noRow", claimed: null };

    const plan = syncPlan(row, snapshot);
    if (plan.write) await tx.subscription.updateMany(plan.write);
    const claimed =
      plan.confirm &&
      snapshot.consent &&
      (await claimConfirmation(tx, customerId, snapshot.id))
        ? {
            userId: row.userId,
            subscriptionId: snapshot.id,
            startedAt: new Date(subscription.start_date * 1000),
            consent: snapshot.consent,
            metadata: subscription.metadata,
          }
        : null;
    return { outcome: plan.write ? "corrected" : "unchanged", claimed };
  }, LOCKED_TRANSACTION);
}

export async function syncSubscription(
  customerId: string,
  subscriptionId: string,
): Promise<SyncOutcome> {
  const { outcome, claimed } = await syncInLock(customerId, subscriptionId);
  if (outcome === "noRow") {
    logger.warn("No row took a subscription", { customerId, subscriptionId });
  }
  // After the commit: the email never waits inside the lock.
  if (claimed) await sendContractConfirmation(claimed);
  return outcome;
}
