import "server-only";

import { syncSubscription } from "@/features/billing/_internal/services/subscription-sync";
import { stripeIdOf } from "@/features/billing/domain/subscription";
import type { StripeEvent } from "@/lib/stripe";

// Each event only names a subscription: the state comes from Stripe, because
// events arrive out of order and their payloads can be stale.
function subscriptionRefs(event: StripeEvent) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription") return null;
      return {
        customerId: stripeIdOf(session.customer),
        subscriptionId: stripeIdOf(session.subscription),
      };
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return {
        customerId: stripeIdOf(event.data.object.customer),
        subscriptionId: event.data.object.id,
      };
    default:
      return null;
  }
}

export async function handleStripeEvent(event: StripeEvent): Promise<void> {
  const refs = subscriptionRefs(event);
  if (!refs?.customerId || !refs.subscriptionId) return;
  await syncSubscription(refs.customerId, refs.subscriptionId);
}
