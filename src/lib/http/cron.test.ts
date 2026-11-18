import { beforeEach, describe, expect, it, vi } from "vitest";

const { info, warn, error } = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(async () => {}),
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { info, warn, error },
}));

import { isCronRequest, runCronJobs, type CronJob } from "@/lib/http/cron";

const SECRET = "a-cron-secret-of-32-characters-x";

describe("isCronRequest", () => {
  it("accepts the bearer of the configured secret", () => {
    expect(isCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("refuses no header, another secret or the secret without Bearer", () => {
    expect(isCronRequest(null, SECRET)).toBe(false);
    expect(isCronRequest("Bearer wrong", SECRET)).toBe(false);
    expect(isCronRequest(SECRET, SECRET)).toBe(false);
  });

  // An unset variable must not make "Bearer " or "Bearer undefined" the key.
  it("refuses every call while the secret is unset or too short", () => {
    expect(isCronRequest("Bearer ", "")).toBe(false);
    expect(isCronRequest("Bearer undefined", undefined)).toBe(false);
    expect(isCronRequest("Bearer short", "short")).toBe(false);
  });
});

describe("runCronJobs", () => {
  const context = { now: new Date(), deadline: Date.now() + 45_000 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function job(name: string, run: CronJob["run"]): CronJob {
    return { name, run };
  }

  it("runs every job in order with the same clock and collects the reports", async () => {
    const seen: string[] = [];
    const result = await runCronJobs(
      [
        job("first", async (c) => {
          seen.push(`first ${c.now.toISOString()}`);
          return { counts: { deleted: 2 }, stoppedEarly: false };
        }),
        job("second", async (c) => {
          seen.push(`second ${c.now.toISOString()}`);
          return { counts: { deleted: 0 }, stoppedEarly: false };
        }),
      ],
      context,
    );

    const at = context.now.toISOString();
    expect(seen).toEqual([`first ${at}`, `second ${at}`]);
    expect(result).toEqual({
      reports: {
        first: { counts: { deleted: 2 }, stoppedEarly: false },
        second: { counts: { deleted: 0 }, stoppedEarly: false },
      },
      failed: [],
    });
    expect(info).toHaveBeenCalledWith("Cron job first finished", {
      numbers: { deleted: 2 },
    });
  });

  it("goes on after a failed job and names it", async () => {
    const failure = new Error("R2 down");
    const result = await runCronJobs(
      [
        job("broken", async () => {
          throw failure;
        }),
        job("next", async () => ({ counts: {}, stoppedEarly: false })),
      ],
      context,
    );

    expect(result.failed).toEqual(["broken"]);
    expect(result.reports).toHaveProperty("next");
    expect(error).toHaveBeenCalledWith("Cron job broken failed", {
      error: failure,
    });
  });

  it("warns when a job stopped at the deadline", async () => {
    await runCronJobs(
      [
        job("long", async () => ({
          counts: { deleted: 9 },
          stoppedEarly: true,
        })),
      ],
      context,
    );

    expect(warn).toHaveBeenCalledWith("Cron job long stopped at the deadline", {
      numbers: { deleted: 9 },
    });
  });
});
