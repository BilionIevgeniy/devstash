export interface Entitlements {
  isPro: boolean;
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
