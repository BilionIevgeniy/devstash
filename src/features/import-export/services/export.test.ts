import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getEntitlements,
  consumeRateLimit,
  getExportCollections,
  getPage,
  logError,
} = vi.hoisted(() => ({
  getEntitlements: vi.fn(),
  consumeRateLimit: vi.fn(),
  getExportCollections: vi.fn(),
  getPage: vi.fn(),
  logError: vi.fn(async () => {}),
}));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/features/collections/queries/export", () => ({
  getExportCollections,
}));
vi.mock("@/features/items/services/export", () => ({
  getUserExportItemPage: getPage,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: logError, warn: vi.fn(), info: vi.fn() },
}));

import { exportUserData } from "@/features/import-export/services/export";

const NOW = new Date("2026-11-12T10:30:00Z");

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

describe("exportUserData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getEntitlements.mockResolvedValue({ isPro: true });
    consumeRateLimit.mockResolvedValue({
      success: true,
      remaining: 0,
      reset: 0,
    });
    getExportCollections.mockResolvedValue([{ id: "c1", name: "React" }]);
  });

  it("refuses a Free user before the rate limit is used", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(exportUserData("user-1", NOW)).resolves.toEqual({
      status: "forbidden",
    });
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("refuses a second export within the minute", async () => {
    consumeRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 9,
    });

    await expect(exportUserData("user-1", NOW)).resolves.toEqual({
      status: "rate-limited",
      reset: 9,
    });
    expect(getPage).not.toHaveBeenCalled();
  });

  it("streams every page into one JSON file, all signed with one now", async () => {
    getPage
      .mockResolvedValueOnce({ items: [{ id: "i1" }], nextCursor: "i1" })
      .mockResolvedValueOnce({ items: [{ id: "i2" }], nextCursor: null });

    const result = await exportUserData("user-1", NOW);
    if (result.status !== "ok") throw new Error("expected ok");

    expect(result.fileName).toBe("devstash-export-2026-11-12.json");
    const json = JSON.parse(await readAll(result.stream));
    expect(json).toMatchObject({
      version: 1,
      collections: [{ id: "c1", name: "React" }],
      items: [{ id: "i1" }, { id: "i2" }],
    });
    expect(getPage.mock.calls).toEqual([
      ["user-1", null, NOW],
      ["user-1", "i1", NOW],
    ]);
  });

  it("reads at most one page ahead of the client", async () => {
    getPage.mockImplementation(async (_userId, cursor: string | null) => {
      const next = Number(cursor ?? 0) + 1;
      return { items: [{ id: String(next) }], nextCursor: String(next) };
    });

    const result = await exportUserData("user-1", NOW);
    if (result.status !== "ok") throw new Error("expected ok");
    const reader = result.stream.getReader();

    for (let read = 1; read <= 3; read += 1) {
      await reader.read();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(getPage.mock.calls.length).toBeLessThanOrEqual(read);
    }
    await reader.cancel();
  });

  it("errors the stream and logs when a page fails, with no closing", async () => {
    const failure = new Error("db down");
    getPage
      .mockResolvedValueOnce({ items: [{ id: "i1" }], nextCursor: "i1" })
      .mockRejectedValueOnce(failure);

    const result = await exportUserData("user-1", NOW);
    if (result.status !== "ok") throw new Error("expected ok");

    await expect(readAll(result.stream)).rejects.toBe(failure);
    expect(logError).toHaveBeenCalledWith("Exporting the items failed", {
      error: failure,
      userId: "user-1",
    });
  });
});
