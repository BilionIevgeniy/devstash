import { purgeStaleRegistrations } from "@/features/account/services/retention";
import { deleteExpiredTokens } from "@/features/auth/services/retention";
import { reconcileSubscriptions } from "@/features/billing/services/reconciliation";
import { sweepUnclaimedUploads } from "@/features/items/services/upload-sweep";
import { fail } from "@/lib/errors/action-result";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { isCronRequest, runCronJobs, type CronJob } from "@/lib/http/cron";

// The daily jobs of the data retention (ADR 0030) and the Stripe
// reconciliation (ADR 0033), called by Vercel Cron
// (vercel.json): one service per job and nothing else, the cheapest first. 60 s is the limit on
// Hobby without Fluid compute; the jobs stop paging at the deadline, well
// before it, and what is left waits for the next day.
export const maxDuration = 60;
const JOB_BUDGET_MS = 45_000;

const JOBS: CronJob[] = [
  {
    name: "expired-tokens",
    run: async ({ now }) => ({
      counts: await deleteExpiredTokens(now),
      stoppedEarly: false,
    }),
  },
  { name: "unclaimed-uploads", run: sweepUnclaimedUploads },
  { name: "stale-registrations", run: purgeStaleRegistrations },
  // Last: one Stripe read per subscription, the most expensive (ADR 0033).
  { name: "stripe-reconciliation", run: reconcileSubscriptions },
];

export async function GET(request: Request) {
  if (
    !isCronRequest(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return jsonError(fail("unauthorized"), 401);
  }

  const now = new Date();
  const { reports, failed } = await runCronJobs(JOBS, {
    now,
    deadline: now.getTime() + JOB_BUDGET_MS,
  });
  return failed.length > 0
    ? jsonError(fail("serverError"), 500)
    : jsonOk(reports);
}
