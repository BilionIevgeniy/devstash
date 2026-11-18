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
