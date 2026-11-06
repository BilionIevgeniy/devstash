import "server-only";

import { prisma } from "@/lib/prisma";

export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  return subscription?.stripeCustomerId ?? null;
}
