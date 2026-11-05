export const FREE_ITEM_LIMIT = 50;
export const FREE_COLLECTION_LIMIT = 3;
export const PRO_MONTHLY_PRICE = 8;
export const PRO_YEARLY_PRICE = 72;

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

// The Stripe statuses that grant Pro. past_due, canceled and the rest do not.
const PRO_STATUSES = ["active", "trialing"];

export function isProStatus(status: string): boolean {
  return PRO_STATUSES.includes(status);
}

// A user with no subscription row passes null and is on the Free plan.
export function entitlementsFor(status: string | null): Entitlements {
  return { isPro: status !== null && isProStatus(status) };
}
