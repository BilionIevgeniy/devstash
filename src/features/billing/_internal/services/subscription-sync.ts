import "server-only";

import {
  subscriptionWrite,
  type SubscriptionSnapshot,
} from "@/features/billing/domain/subscription";
import { LOCKED_TRANSACTION, lockForTransaction } from "@/lib/advisory-lock";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  getStripe,
  isStripeNotFound,
  type StripeSubscription,
} from "@/lib/stripe";

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

// The read is inside the lock, so an older state can never commit last. Safe
// to run many times and at once: webhook retries, and the return from Checkout.
export async function syncSubscription(
  customerId: string,
  subscriptionId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockForTransaction(tx, `stripe-customer:${customerId}`);
    const subscription = await retrieveSubscription(subscriptionId);
    if (!subscription) return;

    const { where, data } = subscriptionWrite(toSnapshot(subscription));
    // The signed event or a checked session is the authority for this write,
    // which is why it is not scoped by userId (ADR 0012). No row: a deleted
    // account or a customer that is not ours.
    const { count } = await tx.subscription.updateMany({ where, data });
    if (count === 0) {
      logger.warn("No row took a subscription", {
        customerId,
        subscriptionId,
      });
    }
  }, LOCKED_TRANSACTION);
}
