import { isProStatus } from "@/features/billing/domain/limits";

const ENDED_STATUSES = ["canceled", "incomplete_expired"];

export interface SubscriptionSnapshot {
  id: string;
  customerId: string;
  status: string;
  currentPeriodEnd: Date | null;
}

export interface SubscriptionWrite {
  where: { stripeCustomerId: string; stripeSubscriptionId?: string };
  data: {
    status: string;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: Date | null;
  };
}

// Stripe sends a reference as an id or, when expanded, as the object.
export function stripeIdOf(
  value: string | { id: string } | null,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

// A live subscription takes the row. Any other writes only over itself, so the
// end of an old subscription cannot overwrite a newer one.
export function subscriptionWrite(
  snapshot: SubscriptionSnapshot,
): SubscriptionWrite {
  const { id, customerId, status, currentPeriodEnd } = snapshot;
  return {
    where: isProStatus(status)
      ? { stripeCustomerId: customerId }
      : { stripeCustomerId: customerId, stripeSubscriptionId: id },
    data: {
      status,
      stripeSubscriptionId: ENDED_STATUSES.includes(status) ? null : id,
      currentPeriodEnd,
    },
  };
}
