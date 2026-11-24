import "server-only";

import { prisma } from "@/lib/postgres/prisma";

export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  return subscription?.stripeCustomerId ?? null;
}

/** The live subscription of a user, for a cancellation; null when none runs. */
export async function getLiveSubscriptionRef(
  userId: string,
): Promise<{ customerId: string; subscriptionId: string } | null> {
  const row = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!row?.stripeCustomerId || !row.stripeSubscriptionId) return null;
  return {
    customerId: row.stripeCustomerId,
    subscriptionId: row.stripeSubscriptionId,
  };
}

/** A row the daily reconciliation compares with Stripe. */
export interface ReconcileRow {
  customerId: string;
  subscriptionId: string;
}

// A cross-user read for the daily reconciliation only (ADR 0030, rule 4 of
// architecture-rules.md): every row that names a subscription, by id, an order
// no write changes, so the daily start (domain/reconciliation.ts) goes round
// all of them. One row per paying customer, so the list stays small; the job
// acts on each through the sync.
export async function getReconcileRows(): Promise<ReconcileRow[]> {
  const rows = await prisma.subscription.findMany({
    where: {
      stripeCustomerId: { not: null },
      stripeSubscriptionId: { not: null },
    },
    orderBy: { id: "asc" },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });
  return rows.flatMap(({ stripeCustomerId, stripeSubscriptionId }) =>
    stripeCustomerId && stripeSubscriptionId
      ? [{ customerId: stripeCustomerId, subscriptionId: stripeSubscriptionId }]
      : [],
  );
}

/** What a customer's row says, for the reconciliation's second pass. */
export interface RowSubscription {
  subscriptionId: string | null;
  status: string;
}

// The subscription each customer's row holds and its status, for the
// reconciliation's second pass; a customer with no row is missing from the map.
export async function getRowSubscriptions(
  customerIds: string[],
): Promise<Map<string, RowSubscription>> {
  const rows = await prisma.subscription.findMany({
    where: { stripeCustomerId: { in: customerIds } },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      status: true,
    },
  });
  return new Map(
    rows.flatMap(({ stripeCustomerId, stripeSubscriptionId, status }) =>
      stripeCustomerId
        ? [
            [
              stripeCustomerId,
              { subscriptionId: stripeSubscriptionId, status },
            ] as const,
          ]
        : [],
    ),
  );
}
