import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { logger } from "@/lib/observability/logger";

// Vercel signs each cron call with `Authorization: Bearer <CRON_SECRET>`.
const MIN_CRON_SECRET_LENGTH = 16;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// True only for the configured secret. An unset or short secret refuses every
// call, so a missing variable never opens the route. Both sides are hashed
// first, so the comparison takes the same time whatever the header's length.
export function isCronRequest(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || secret.length < MIN_CRON_SECRET_LENGTH || !authorization) {
    return false;
  }
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}

export interface CronContext {
  now: Date;
  /** Epoch ms after which a job stops paging; what is left waits a day. */
  deadline: number;
}

export interface CronJobReport {
  counts: Record<string, number>;
  /** True when the deadline cut the job short. */
  stoppedEarly: boolean;
}

export interface CronJob {
  /** A constant: it goes into the log message. */
  name: string;
  /** What the job may take; what the jobs before it left over comes on top. */
  budgetMs: number;
  run: (context: CronContext) => Promise<CronJobReport>;
}

export interface CronRunResult {
  reports: Record<string, CronJobReport>;
  failed: string[];
}

// Runs the jobs one after another with one clock. A job's deadline is the sum
// of the budgets up to its own, from the start of the run: time a job leaves
// over goes to the next ones, and the whole run never plans for more than the
// sum. A job that stops at its deadline leaves the ones after it their time; one
// that overruns between two checks takes it from them. A failed job is logged and
// the next one still runs; the caller answers with an error when any failed.
// Vercel retries nothing and may run a job twice, so every job is idempotent.
export async function runCronJobs(
  jobs: CronJob[],
  now: Date,
): Promise<CronRunResult> {
  const result: CronRunResult = { reports: {}, failed: [] };
  let deadline = now.getTime();

  for (const job of jobs) {
    deadline += job.budgetMs;
    try {
      const report = await job.run({ now, deadline });
      result.reports[job.name] = report;
      const log = report.stoppedEarly ? logger.warn : logger.info;
      log(
        report.stoppedEarly
          ? `Cron job ${job.name} stopped at the deadline`
          : `Cron job ${job.name} finished`,
        { numbers: report.counts },
      );
    } catch (error) {
      result.failed.push(job.name);
      await logger.error(`Cron job ${job.name} failed`, { error });
    }
  }
  return result;
}
