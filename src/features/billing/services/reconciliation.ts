import "server-only";

import {
  getReconcileRows,
  getRowSubscriptions,
  type RowSubscription,
} from "@/features/billing/_internal/queries";
import {
  syncSubscription,
  type SyncOutcome,
} from "@/features/billing/_internal/services/subscription-sync";
import {
  rotateForDay,
  rowsDeadline,
} from "@/features/billing/domain/reconciliation";
import {
  liveSubscriptionCheck,
  stripeIdOf,
} from "@/features/billing/domain/subscription";
import type { CronContext, CronJobReport } from "@/lib/http/cron";
import { logger } from "@/lib/observability/logger";
import { getStripe, type StripeSubscription } from "@/lib/vendors/stripe";

const STRIPE_PAGE_SIZE = 100;
// The SDK waits 80 seconds and retries by itself, longer than the whole run:
// one stalled request would outlive every deadline here.
const STRIPE_REQUEST = { timeout: 8_000, maxNetworkRetries: 0 };

interface Counts {
  checked: number;
  corrected: number;
  missingRow: number;
  duplicate: number;
  failed: number;
}

// One subscription that cannot be synced is logged and counted, and the next
// one is tried: it would otherwise end the job there every day.
async function syncOne(
  counts: Counts,
  customerId: string,
  subscriptionId: string,
): Promise<void> {
  let outcome: SyncOutcome;
  try {
    outcome = await syncSubscription(customerId, subscriptionId, {
      quiet: true,
      request: STRIPE_REQUEST,
    });
  } catch (error) {
    counts.failed += 1;
    await logger.error("Reconciling a subscription failed", {
      error,
      customerId,
      subscriptionId,
    });
    return;
  }
  counts.checked += 1;
  if (outcome === "corrected") counts.corrected += 1;
  if (outcome === "noRow") counts.missingRow += 1;
}

// Pass 1: every row that names a subscription is synced with what Stripe says,
// which ends a Pro row whose cancellation webhook was lost.
async function reconcileRows(
  counts: Counts,
  now: Date,
  deadline: number,
): Promise<boolean> {
  for (const row of rotateForDay(await getReconcileRows(), now)) {
    if (Date.now() > deadline) return false;
    await syncOne(counts, row.customerId, row.subscriptionId);
  }
  return true;
}

async function reconcileLiveOne(
  counts: Counts,
  customerId: string,
  subscription: StripeSubscription,
  row: RowSubscription | undefined,
): Promise<void> {
  const check = liveSubscriptionCheck(subscription, row);
  if (check === "noRow") counts.missingRow += 1;
  if (check === "sync") await syncOne(counts, customerId, subscription.id);
  if (check === "duplicate") {
    counts.duplicate += 1;
    await logger.error("A customer has two live subscriptions", {
      customerId,
      subscriptionId: subscription.id,
    });
  }
}

// Pass 2: Stripe's subscriptions that are not canceled, the live ones synced
// when their row does not name them (a paid checkout whose webhook was lost).
// Stripe lists the newest first and a lost checkout is a recent one, so this
// pass needs no turn: cut short, it has seen the ones that matter.
async function reconcileLive(
  counts: Counts,
  deadline: number,
): Promise<boolean> {
  let startingAfter: string | undefined;
  for (;;) {
    if (Date.now() > deadline) return false;
    const page = await getStripe().subscriptions.list(
      {
        limit: STRIPE_PAGE_SIZE,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      STRIPE_REQUEST,
    );
    const customers = page.data.flatMap((s) => stripeIdOf(s.customer) ?? []);
    const rows = await getRowSubscriptions(customers);
    for (const subscription of page.data) {
      if (Date.now() > deadline) return false;
      const customerId = stripeIdOf(subscription.customer);
      if (!customerId) continue;
      const row = rows.get(customerId);
      await reconcileLiveOne(counts, customerId, subscription, row);
    }
    if (!page.has_more) return true;
    startingAfter = page.data.at(-1)?.id;
  }
}

// The daily job's part for billing (app/api/cron/daily, ADR 0033): webhooks
// lost for longer than Stripe's three days of retries leave a row stale, so
// once a day every row is compared with Stripe. The write is the sync's (the
// lock, the read inside it, written by customer, ADR 0012), so the job is
// idempotent, and a row that is right costs one Stripe read and no write. Each
// pass has its own share of the time, so neither keeps the other from running.
export async function reconcileSubscriptions({
  now,
  deadline,
}: CronContext): Promise<CronJobReport> {
  const counts: Counts = {
    checked: 0,
    corrected: 0,
    missingRow: 0,
    duplicate: 0,
    failed: 0,
  };
  const rowsDone = await reconcileRows(
    counts,
    now,
    rowsDeadline(Date.now(), deadline),
  );
  const liveDone = await reconcileLive(counts, deadline);
  // Once per run: a test account shared with other projects has many.
  if (counts.missingRow > 0) {
    logger.warn("Stripe subscriptions with no row of ours", {
      numbers: { missingRow: counts.missingRow },
    });
  }
  return { counts: { ...counts }, stoppedEarly: !rowsDone || !liveDone };
}
