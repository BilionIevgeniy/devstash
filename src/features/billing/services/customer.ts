import "server-only";

import { getStripeCustomerId } from "@/features/billing/_internal/queries";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeNotFound } from "@/lib/stripe";

// Deleting the customer cancels its subscriptions at once. No customer: the
// demo user keeps its row. updateMany: a delete from another tab can have
// removed the row by now.
export async function deleteBillingCustomer(userId: string): Promise<void> {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) return;

  try {
    await getStripe().customers.del(customerId);
  } catch (error) {
    if (!isStripeNotFound(error)) throw error;
  }

  await prisma.subscription.updateMany({
    where: { userId },
    data: {
      status: "canceled",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    },
  });
}
