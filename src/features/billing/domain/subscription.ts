import { isProStatus } from "@/features/billing/domain/limits";

const ENDED_STATUSES = ["canceled", "incomplete_expired"];

/** The § 356 (5) BGB consent the order step stored on the Stripe subscription. */
export interface SubscriptionConsent {
  withdrawalWaiverAt: Date;
  termsVersion: string;
}

export interface SubscriptionSnapshot {
  id: string;
  customerId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  /** Null for a subscription bought before the order step (ADR 0032). */
  consent: SubscriptionConsent | null;
}

export interface SubscriptionWrite {
  where: { stripeCustomerId: string; stripeSubscriptionId?: string };
  data: {
    status: string;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    withdrawalWaiverAt?: Date;
    termsVersion?: string;
  };
}

/** The columns of the row the sync compares with Stripe. */
export interface SubscriptionRowState {
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  withdrawalWaiverAt: Date | null;
  termsVersion: string | null;
  confirmedSubscriptionId: string | null;
}

export interface SyncPlan {
  /** The write to make, or null when the row already says what Stripe says. */
  write: SubscriptionWrite | null;
  /** Claim and send the § 312f confirmation of this subscription. */
  confirm: boolean;
}

// Stripe sends a reference as an id or, when expanded, as the object.
export function stripeIdOf(
  value: string | { id: string } | null,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

// The consent the order step put in the subscription's metadata, or null when
// either part is missing or the time does not parse.
export function consentFromMetadata(
  metadata: Record<string, string> | null | undefined,
): SubscriptionConsent | null {
  const termsVersion = metadata?.termsVersion;
  const waiver = metadata?.withdrawalWaiverAt;
  if (!termsVersion || !waiver) return null;
  const withdrawalWaiverAt = new Date(waiver);
  if (Number.isNaN(withdrawalWaiverAt.getTime())) return null;
  return { withdrawalWaiverAt, termsVersion };
}

// A live subscription takes the row. Any other writes only over itself, so the
// end of an old subscription cannot overwrite a newer one.
export function subscriptionWrite(
  snapshot: SubscriptionSnapshot,
): SubscriptionWrite {
  const { id, customerId, status, currentPeriodEnd, consent } = snapshot;
  return {
    where: isProStatus(status)
      ? { stripeCustomerId: customerId }
      : { stripeCustomerId: customerId, stripeSubscriptionId: id },
    data: {
      status,
      stripeSubscriptionId: ENDED_STATUSES.includes(status) ? null : id,
      currentPeriodEnd,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      ...(consent ?? {}),
    },
  };
}

function sameTime(a: Date | null | undefined, b: Date | null | undefined) {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

function differs(row: SubscriptionRowState, data: SubscriptionWrite["data"]) {
  return (
    row.status !== data.status ||
    row.stripeSubscriptionId !== data.stripeSubscriptionId ||
    !sameTime(row.currentPeriodEnd, data.currentPeriodEnd) ||
    row.cancelAtPeriodEnd !== data.cancelAtPeriodEnd ||
    (data.termsVersion !== undefined &&
      row.termsVersion !== data.termsVersion) ||
    (data.withdrawalWaiverAt !== undefined &&
      !sameTime(row.withdrawalWaiverAt, data.withdrawalWaiverAt))
  );
}

// What the sync does with a row and what Stripe says. A write that the row's
// subscription id does not allow is no write at all. The confirmation is due
// once per live subscription bought through the order step: one without the
// consent in its metadata never gets one, so a renewal of an older
// subscription cannot send a consent its customer never gave.
export function syncPlan(
  row: SubscriptionRowState,
  snapshot: SubscriptionSnapshot,
): SyncPlan {
  const write = subscriptionWrite(snapshot);
  const allowed =
    write.where.stripeSubscriptionId === undefined ||
    write.where.stripeSubscriptionId === row.stripeSubscriptionId;
  if (!allowed) return { write: null, confirm: false };

  return {
    write: differs(row, write.data) ? write : null,
    confirm:
      isProStatus(snapshot.status) &&
      snapshot.consent !== null &&
      row.confirmedSubscriptionId !== snapshot.id,
  };
}
