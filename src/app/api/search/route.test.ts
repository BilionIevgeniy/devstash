import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, searchPalette } = vi.hoisted(() => ({
  auth: vi.fn(),
  searchPalette: vi.fn(),
}));
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/search/services/search", () => ({ searchPalette }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(async () => {}), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/rate-limit", () => ({
  RateLimitUnavailableError: class RateLimitUnavailableError extends Error {},
}));

import { GET } from "@/app/api/search/route";
import { RateLimitUnavailableError } from "@/lib/rate-limit";

const results = {
  items: [],
  collections: [{ id: "col-1", name: "React", itemCount: 2 }],
  nextCursor: null,
};

function get(query = "", signal?: AbortSignal) {
  return GET(new Request(`http://localhost/api/search${query}`, { signal }));
}

describe("GET /api/search", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    searchPalette.mockReset().mockResolvedValue({ status: "ok", results });
  });

  it("answers 401 without a session and never searches", async () => {
    auth.mockResolvedValue(null);

    const response = await get("?q=react");

    expect(response.status).toBe(401);
    expect(searchPalette).not.toHaveBeenCalled();
  });

  it("answers 400 for a text over the limit or a bad cursor", async () => {
    expect((await get(`?q=${"a".repeat(101)}`)).status).toBe(400);
    expect((await get("?q=react&cursor=-1")).status).toBe(400);
    expect((await get("?q=react&cursor=x")).status).toBe(400);
    expect(searchPalette).not.toHaveBeenCalled();
  });

  it("searches the trimmed text from the cursor, kept out of shared caches", async () => {
    const response = await get("?q=%20react%20&cursor=20");

    expect(searchPalette).toHaveBeenCalledWith(
      "user-1",
      { q: "react", cursor: 20 },
      expect.any(AbortSignal),
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      success: true,
      data: results,
      error: null,
    });
  });

  it("asks for the recent list when there is no text", async () => {
    await get();

    expect(searchPalette.mock.calls[0][1]).toEqual({ q: "", cursor: 0 });
  });

  it("answers 429 with Retry-After over the limit", async () => {
    searchPalette.mockResolvedValue({
      status: "rate-limited",
      reset: Date.now() + 30_000,
    });

    const response = await get("?q=react");

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("answers 503 when the limiter cannot answer", async () => {
    searchPalette.mockRejectedValue(new RateLimitUnavailableError());

    expect((await get("?q=react")).status).toBe(503);
  });

  it("answers 500 with a plain message when the search fails", async () => {
    searchPalette.mockRejectedValue(new Error("connection lost"));

    const response = await get("?q=react");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      data: null,
      error: "Something went wrong",
    });
  });

  it("does not report a search the client abandoned", async () => {
    const controller = new AbortController();
    searchPalette.mockImplementation(async () => {
      controller.abort();
      throw new DOMException("aborted", "AbortError");
    });
    const { logger } = await import("@/lib/logger");

    const response = await get("?q=react", controller.signal);

    expect(response.status).toBe(499);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
