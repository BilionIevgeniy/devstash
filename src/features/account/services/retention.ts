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
export async function purgeStaleRegistrations({
  now,
  deadline,
}: CronContext): Promise<CronJobReport> {
  const counts = { deleted: 0, failed: 0 };
  let afterId: string | null = null;

  for (;;) {
    if (Date.now() > deadline) return { counts, stoppedEarly: true };
    const ids = await getStaleRegistrationIds(now, afterId, PAGE_SIZE);
    if (ids.length === 0) return { counts, stoppedEarly: false };

    for (const userId of ids) {
      if (await purgeOne(userId, now)) counts.deleted += 1;
      else counts.failed += 1;
    }
    afterId = ids[ids.length - 1];
  }
}

// True when the registration is gone, or no longer stale (verified meanwhile).
async function purgeOne(userId: string, now: Date): Promise<boolean> {
  try {
    const verified = await verifyStaleRegistration(userId, now);
    if (!verified) return true;
    const result = await removeVerifiedAccount(verified);
    if (!result.success) {
      logger.warn("Removing a stale registration failed", { userId });
    }
    return result.success;
  } catch (error) {
    await logger.error("Removing a stale registration failed", {
      error,
      userId,
    });
    return false;
  }
}
