import "server-only";

import { removeVerifiedAccount } from "@/features/account/_internal/services/remove-account";
import { getStaleRegistrationIds } from "@/features/auth/queries";
import { verifyStaleRegistration } from "@/features/auth/services/account";
import type { CronContext, CronJobReport } from "@/lib/http/cron";
import { logger } from "@/lib/observability/logger";

const PAGE_SIZE = 100;

// The daily job's part for registrations never verified within
// UNVERIFIED_REGISTRATION_DAYS (app/api/cron/daily). Each one is deleted
// through the same path as a user's own delete, after `auth` has checked it
// again. Pages by id, so a user whose delete fails is skipped and retried the
// next day; at the deadline it stops. A second run finds nobody left.
type PurgeOutcome = "deleted" | "skipped" | "failed";

export async function purgeStaleRegistrations({
  now,
  deadline,
}: CronContext): Promise<CronJobReport> {
  const counts: Record<PurgeOutcome, number> = {
    deleted: 0,
    skipped: 0,
    failed: 0,
  };
  let afterId: string | null = null;

  for (;;) {
    const ids = await getStaleRegistrationIds(now, afterId, PAGE_SIZE);
    if (ids.length === 0) return { counts, stoppedEarly: false };

    // Before each one: a delete calls Stripe and R2, and a page has 100.
    for (const userId of ids) {
      if (Date.now() > deadline) return { counts, stoppedEarly: true };
      counts[await purgeOne(userId, now)] += 1;
    }
    afterId = ids[ids.length - 1];
  }
}

// "skipped" when the registration is no longer stale (verified meanwhile).
async function purgeOne(userId: string, now: Date): Promise<PurgeOutcome> {
  try {
    const verified = await verifyStaleRegistration(userId, now);
    if (!verified) return "skipped";
    const result = await removeVerifiedAccount(verified);
    if (!result.success) {
      logger.warn("Removing a stale registration failed", { userId });
      return "failed";
    }
    return result.data.removed ? "deleted" : "skipped";
  } catch (error) {
    await logger.error("Removing a stale registration failed", {
      error,
      userId,
    });
    return "failed";
  }
}
