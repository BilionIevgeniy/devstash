import type { BillingOverview } from "@/features/billing/types";

export const FREE_ITEM_LIMIT = 50;
export const FREE_COLLECTION_LIMIT = 3;
export const PRO_MONTHLY_PRICE = 8;
export const PRO_YEARLY_PRICE = 72;

export const FREE_PLAN_FEATURES = [
  `${FREE_ITEM_LIMIT} items`,
  `${FREE_COLLECTION_LIMIT} collections`,
  "Snippets, prompts, commands, notes and links",
  "Basic search",
];

// What Pro gives today: the upgrade page sells these, so nothing unbuilt goes
// here. The homepage adds its roadmap lines on top.
export const PRO_PLAN_FEATURES = [
  "Unlimited items",
  "Unlimited collections",
  "File and image uploads",
  "AI tag suggestions",
  "AI summaries",
  "AI code explanations",
  "AI prompt optimization",
];

const MONTHS_PER_YEAR = 12;

export interface Entitlements {
  isPro: boolean;
}

export function proYearlyPricePerMonth(): number {
  return PRO_YEARLY_PRICE / MONTHS_PER_YEAR;
}

export function proYearlySavingsPercent(): number {
  const fullYear = PRO_MONTHLY_PRICE * MONTHS_PER_YEAR;
  return Math.round((1 - PRO_YEARLY_PRICE / fullYear) * 100);
}

// What the Pro card of a pricing table shows for the chosen period.
export function proPriceDisplay(yearly: boolean): {
  price: string;
  note: string;
} {
  if (yearly) {
    return {
      price: `$${proYearlyPricePerMonth()}`,
      note: `Billed $${PRO_YEARLY_PRICE}/yr`,
    };
  }
  return { price: `$${PRO_MONTHLY_PRICE}`, note: "Billed monthly" };
}

// The Stripe statuses that grant Pro: Pro lasts while Stripe is still trying to
// collect (ADR 0011). The Dashboard cancels the subscription when retries end.
// subscriptionWrite reads this too, so a change here also changes which
// subscription may write the row.
const PRO_STATUSES = ["active", "trialing", "past_due"];

const PAYMENT_ISSUE_STATUS = "past_due";

export function withinFreeItemLimit(itemCount: number): boolean {
  return itemCount < FREE_ITEM_LIMIT;
}

export function withinFreeCollectionLimit(collectionCount: number): boolean {
  return collectionCount < FREE_COLLECTION_LIMIT;
}

// True at a limit as well as over it: from there a Free user creates nothing,
// and a cancelled Pro account can be far over.
export function reachedFreeLimit(
  itemCount: number,
  collectionCount: number,
): boolean {
  return (
    !withinFreeItemLimit(itemCount) ||
    !withinFreeCollectionLimit(collectionCount)
  );
}

export function isProStatus(status: string): boolean {
  return PRO_STATUSES.includes(status);
}

// A user with no subscription row passes null and is on the Free plan.
export function entitlementsFor(status: string | null): Entitlements {
  return { isPro: status !== null && isProStatus(status) };
}

export function billingOverviewFor(
  subscription: { status: string; stripeCustomerId: string | null } | null,
): BillingOverview {
  return {
    ...entitlementsFor(subscription?.status ?? null),
    hasBillingAccount: Boolean(subscription?.stripeCustomerId),
    paymentIssue: subscription?.status === PAYMENT_ISSUE_STATUS,
  };
}
