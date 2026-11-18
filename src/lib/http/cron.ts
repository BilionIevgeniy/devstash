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
  run: (context: CronContext) => Promise<CronJobReport>;
}

export interface CronRunResult {
  reports: Record<string, CronJobReport>;
  failed: string[];
}

// Runs the jobs one after another with one clock. A failed job is logged and
// the next one still runs; the caller answers with an error when any failed.
// Vercel retries nothing and may run a job twice, so every job is idempotent.
export async function runCronJobs(
  jobs: CronJob[],
  context: CronContext,
): Promise<CronRunResult> {
  const result: CronRunResult = { reports: {}, failed: [] };

  for (const job of jobs) {
    try {
      const report = await job.run(context);
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
