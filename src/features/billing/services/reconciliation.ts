import "server-only";

import {
  getReconcileRows,
  getRowSubscriptionIds,
} from "@/features/billing/_internal/queries";
import {
  syncSubscription,
  type SyncOutcome,
} from "@/features/billing/_internal/services/subscription-sync";
import {
  liveSubscriptionCheck,
  stripeIdOf,
} from "@/features/billing/domain/subscription";
import type { CronContext, CronJobReport } from "@/lib/http/cron";
import { logger } from "@/lib/observability/logger";
import { getStripe } from "@/lib/vendors/stripe";

const STRIPE_PAGE_SIZE = 100;

interface Counts {
  checked: number;
  corrected: number;
  missingRow: number;
}

function count(counts: Counts, outcome: SyncOutcome) {
  counts.checked += 1;
  if (outcome === "corrected") counts.corrected += 1;
  if (outcome === "noRow") counts.missingRow += 1;
}

// Pass 1: every row that names a subscription is synced with what Stripe says,
// which ends a Pro row whose cancellation webhook was lost.
async function reconcileRows(
  counts: Counts,
  deadline: number,
): Promise<boolean> {
  for (const row of await getReconcileRows()) {
    if (Date.now() > deadline) return false;
    const outcome = await syncSubscription(row.customerId, row.subscriptionId, {
      quiet: true,
    });
    count(counts, outcome);
  }
  return true;
}

// Pass 2: Stripe's subscriptions that are not canceled, the live ones synced
// when their row does not name them (a paid checkout whose webhook was lost).
async function reconcileLive(
  counts: Counts,
  deadline: number,
): Promise<boolean> {
  let startingAfter: string | undefined;
  for (;;) {
    if (Date.now() > deadline) return false;
    const page = await getStripe().subscriptions.list({
      limit: STRIPE_PAGE_SIZE,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    const customers = page.data.flatMap((s) => stripeIdOf(s.customer) ?? []);
    const rows = await getRowSubscriptionIds(customers);
    for (const subscription of page.data) {
      const customerId = stripeIdOf(subscription.customer);
      if (!customerId) continue;
      const check = liveSubscriptionCheck(subscription, rows.get(customerId));
      if (check === "noRow") counts.missingRow += 1;
      if (check === "sync") {
        count(
          counts,
          await syncSubscription(customerId, subscription.id, { quiet: true }),
        );
      }
    }
    if (!page.has_more) return true;
    startingAfter = page.data.at(-1)?.id;
  }
}

// The daily job's part for billing (app/api/cron/daily, ADR 0033): webhooks
// lost for longer than Stripe's three days of retries leave a row stale, so
// once a day every row is compared with Stripe. The write is the sync's (the
// lock, the read inside it, written by customer, ADR 0012), so the job is
// idempotent, and a row that is right costs one Stripe read and no write.
export async function reconcileSubscriptions({
  deadline,
}: CronContext): Promise<CronJobReport> {
  const counts: Counts = { checked: 0, corrected: 0, missingRow: 0 };
  const finished =
    (await reconcileRows(counts, deadline)) &&
    (await reconcileLive(counts, deadline));
  // Once per run: a test account shared with other projects has many.
  if (counts.missingRow > 0) {
    logger.warn("Stripe subscriptions with no row of ours", {
      numbers: { missingRow: counts.missingRow },
    });
  }
  return { counts: { ...counts }, stoppedEarly: !finished };
}
