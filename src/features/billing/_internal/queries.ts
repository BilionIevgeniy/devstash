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
// architecture-rules.md): every row that names a subscription, the least
// recently written first, so a run cut short by the deadline still reaches
// the oldest rows. Read once before the job writes: a corrected row moves to
// the end of this order, which would throw a cursor off. One row per paying
// customer, so the list stays small; the job acts on each through the sync.
export async function getReconcileRows(): Promise<ReconcileRow[]> {
  const rows = await prisma.subscription.findMany({
    where: {
      stripeCustomerId: { not: null },
      stripeSubscriptionId: { not: null },
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });
  return rows.flatMap(({ stripeCustomerId, stripeSubscriptionId }) =>
    stripeCustomerId && stripeSubscriptionId
      ? [{ customerId: stripeCustomerId, subscriptionId: stripeSubscriptionId }]
      : [],
  );
}

// The subscription each customer's row holds, for the reconciliation's second
// pass; a customer with no row is missing from the map.
export async function getRowSubscriptionIds(
  customerIds: string[],
): Promise<Map<string, string | null>> {
  const rows = await prisma.subscription.findMany({
    where: { stripeCustomerId: { in: customerIds } },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });
  return new Map(
    rows.flatMap(({ stripeCustomerId, stripeSubscriptionId }) =>
      stripeCustomerId
        ? [[stripeCustomerId, stripeSubscriptionId] as const]
        : [],
    ),
  );
}
