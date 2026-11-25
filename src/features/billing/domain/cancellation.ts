import { isProStatus } from "@/features/billing/domain/limits";

const HOUR_SECONDS = 60 * 60;

/** § 312k (2) BGB: an ordinary cancellation, or one for good cause with its reason. */
export const CANCELLATION_KINDS = ["ordinary", "extraordinary"] as const;
export type CancellationKind = (typeof CANCELLATION_KINDS)[number];

export const CANCELLATION_NAME_MAX = 200;
export const CANCELLATION_REASON_MAX = 2000;

// The signed-out form (ADR 0032). Both limits depend only on how often a
// request comes, never on whether an account exists, so a refusal can say so.
export const CANCEL_BY_IP = {
  name: "cancel:ip",
  limit: 10,
  windowSeconds: HOUR_SECONDS,
} as const;

export const CANCEL_BY_EMAIL = {
  name: "cancel:email",
  limit: 3,
  windowSeconds: HOUR_SECONDS,
} as const;

// The signed-in declaration for good cause on a contract that already ends: it
// changes nothing by itself, so each one is only mail, to the operator and the
// holder.
export const CANCEL_BY_USER = {
  name: "cancel:user",
  limit: 3,
  windowSeconds: HOUR_SECONDS,
} as const;

export type ContractStatus = "none" | "live" | "cancelling";

/** What the cancellation page shows a signed-in user; JSON-safe. */
export interface ContractState {
  status: ContractStatus;
  /** ISO date of the end of the current term, when known. */
  periodEnd: string | null;
}

// A contract runs while the subscription grants Pro; one already set to end at
// the period end needs no second cancellation.
export function contractStateFor(
  row: {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    stripeSubscriptionId: string | null;
  } | null,
): ContractState {
  if (!row?.stripeSubscriptionId || !isProStatus(row.status)) {
    return { status: "none", periodEnd: null };
  }
  return {
    status: row.cancelAtPeriodEnd ? "cancelling" : "live",
    periodEnd: row.currentPeriodEnd?.toISOString() ?? null,
  };
}
