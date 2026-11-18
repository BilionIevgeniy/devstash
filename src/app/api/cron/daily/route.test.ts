import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { deleteExpiredTokens } = vi.hoisted(() => ({
  deleteExpiredTokens: vi.fn(),
}));
vi.mock("@/features/auth/services/retention", () => ({ deleteExpiredTokens }));
vi.mock("@/features/items/services/upload-sweep", () => ({
  sweepUnclaimedUploads: vi.fn(async () => ({
    counts: { scanned: 0, deleted: 0 },
    stoppedEarly: false,
  })),
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(async () => {}) },
}));

import { GET } from "@/app/api/cron/daily/route";

const SECRET = "a-cron-secret-of-32-characters-x";

function call(authorization?: string) {
  return GET(
    new Request("https://devstash.test/api/cron/daily", {
      headers: authorization ? { authorization } : {},
    }),
  );
}

describe("GET /api/cron/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", SECRET);
    deleteExpiredTokens.mockResolvedValue({ deleted: 3 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses a call without the secret or with another one, and runs nothing", async () => {
    for (const response of [await call(), await call("Bearer wrong")]) {
      expect(response.status).toBe(401);
    }
    expect(deleteExpiredTokens).not.toHaveBeenCalled();
  });

  it("refuses even the right header while the secret is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
  });

  it("runs the jobs and answers with their counts", async () => {
    const response = await call(`Bearer ${SECRET}`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        "expired-tokens": { counts: { deleted: 3 }, stoppedEarly: false },
      },
    });
  });

  it("answers 500 when a job failed, so the run shows as failed", async () => {
    deleteExpiredTokens.mockRejectedValue(new Error("database down"));

    const response = await call(`Bearer ${SECRET}`);

    expect(response.status).toBe(500);
  });
});
