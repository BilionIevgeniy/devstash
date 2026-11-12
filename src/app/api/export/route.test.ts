import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, exportUserData } = vi.hoisted(() => ({
  auth: vi.fn(),
  exportUserData: vi.fn(),
}));
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/import-export/services/export", () => ({
  exportUserData,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(async () => {}), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/rate-limit", () => ({
  RateLimitUnavailableError: class RateLimitUnavailableError extends Error {},
}));

import { GET } from "@/app/api/export/route";
import { RateLimitUnavailableError } from "@/lib/rate-limit";

describe("GET /api/export", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    exportUserData.mockReset();
  });

  it("answers 401 without a session and never exports", async () => {
    auth.mockResolvedValue(null);

    expect((await GET()).status).toBe(401);
    expect(exportUserData).not.toHaveBeenCalled();
  });

  it("answers 403 for a Free user and 429 with Retry-After within the minute", async () => {
    exportUserData.mockResolvedValueOnce({ status: "forbidden" });
    const forbidden = await GET();
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toMatchObject({
      error: "Export is a Pro feature",
    });

    exportUserData.mockResolvedValueOnce({
      status: "rate-limited",
      reset: Date.now() + 30_000,
    });
    const limited = await GET();
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("answers 503 when the limiter cannot answer", async () => {
    exportUserData.mockRejectedValue(new RateLimitUnavailableError());

    expect((await GET()).status).toBe(503);
  });

  it("streams the file as a private attachment", async () => {
    const stream = new Response('{"version":1}').body;
    exportUserData.mockResolvedValue({
      status: "ok",
      fileName: "devstash-export-2026-11-12.json",
      stream,
    });

    const response = await GET();

    expect(exportUserData).toHaveBeenCalledWith("user-1", expect.any(Date));
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="devstash-export-2026-11-12.json"',
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).toBe('{"version":1}');
  });
});
