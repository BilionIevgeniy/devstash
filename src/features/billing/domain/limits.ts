import type { BillingOverview } from "@/features/billing/types";

export const FREE_ITEM_LIMIT = 50;
export const FREE_COLLECTION_LIMIT = 3;
export const PRO_MONTHLY_PRICE = 8;
export const PRO_YEARLY_PRICE = 72;

// The lines of a pricing card, as keys of the `billing.features` messages:
// the component words them. "items" and "collections" take the Free limits.
export const FREE_PLAN_FEATURES = [
  "items",
  "collections",
  "basicTypes",
  "basicSearch",
] as const;

// What Pro gives today: the upgrade page and the homepage sell these, so
// nothing unbuilt goes here.
export const PRO_PLAN_FEATURES = [
  "unlimitedItems",
  "unlimitedCollections",
  "uploads",
  "aiTags",
  "aiSummaries",
  "aiExplain",
  "aiOptimize",
  "customTypes",
  "exportJson",
] as const;

export type PlanFeature =
  (typeof FREE_PLAN_FEATURES)[number] | (typeof PRO_PLAN_FEATURES)[number];

/** The number a plan line counts, for the lines that have one. */
export function planFeatureCount(feature: PlanFeature): number | undefined {
  if (feature === "items") return FREE_ITEM_LIMIT;
  if (feature === "collections") return FREE_COLLECTION_LIMIT;
  return undefined;
}

const MONTHS_PER_YEAR = 12;

export interface Entitlements {
  isPro: boolean;
  /** Pro, or a Pro subscription that has ended: the AGB (section 7) promise
   * that exporting stays possible then. */
  canExport: boolean;
}

/** The columns of a subscription row the plan is read from. */
export interface PlanRow {
  status: string;
  currentPeriodEnd: Date | null;
}

export function proYearlyPricePerMonth(): number {
  return PRO_YEARLY_PRICE / MONTHS_PER_YEAR;
}

export function proYearlySavingsPercent(): number {
  const fullYear = PRO_MONTHLY_PRICE * MONTHS_PER_YEAR;
  return Math.round((1 - PRO_YEARLY_PRICE / fullYear) * 100);
}

// What the Pro card of a pricing table shows for the chosen period, in euros
// including VAT: the price per month, and the yearly total when billed yearly.
// The component formats them for the locale.
export function proPriceDisplay(yearly: boolean): {
  perMonth: number;
  yearlyTotal: number | null;
} {
  return yearly
    ? { perMonth: proYearlyPricePerMonth(), yearlyTotal: PRO_YEARLY_PRICE }
    : { perMonth: PRO_MONTHLY_PRICE, yearlyTotal: null };
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

// After Pro ends, an account over the Free limit may no longer rewrite its
// items' text (ADR 0032): rewriting an old item would get around the limit.
// At the limit or under it nothing changes.
export function textEditsAllowed(isPro: boolean, itemCount: number): boolean {
  return isPro || itemCount <= FREE_ITEM_LIMIT;
}

export function isProStatus(status: string): boolean {
  return PRO_STATUSES.includes(status);
}

// The Stripe statuses of a subscription that was Pro and is not any more.
const FORMER_PRO_STATUSES = ["canceled", "unpaid", "paused"];

// A row has a period only from a Stripe subscription. The one a checkout opens
// has none (and is "incomplete"), and neither has the one of an account whose
// deletion failed half-way (services/customer.ts).
function wasPro({ status, currentPeriodEnd }: PlanRow): boolean {
  return currentPeriodEnd !== null && FORMER_PRO_STATUSES.includes(status);
}

// A user with no subscription row passes null and is on the Free plan.
export function entitlementsFor(row: PlanRow | null): Entitlements {
  const isPro = row !== null && isProStatus(row.status);
  return { isPro, canExport: isPro || (row !== null && wasPro(row)) };
}

export function billingOverviewFor(
  subscription: { status: string; stripeCustomerId: string | null } | null,
): BillingOverview {
  return {
    isPro: subscription !== null && isProStatus(subscription.status),
    hasBillingAccount: Boolean(subscription?.stripeCustomerId),
    paymentIssue: subscription?.status === PAYMENT_ISSUE_STATUS,
  };
}
