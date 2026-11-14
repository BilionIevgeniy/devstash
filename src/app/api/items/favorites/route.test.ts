import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const getFavoriteItemPage = vi.hoisted(() => vi.fn());
const logError = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/items/queries/lists", () => ({ getFavoriteItemPage }));
vi.mock("@/lib/logger", () => ({
  logger: { error: logError, warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "@/app/api/items/favorites/route";
import { encodeListCursor } from "@/features/items/domain/list-cursor";

const NEWEST_CURSOR = encodeListCursor("newest", [
  "2026-03-01T10:00:00.000Z",
  "item-30",
]);

function callGet(query: string) {
  return GET(new Request(`http://localhost/api/items/favorites${query}`));
}

describe("GET /api/items/favorites", () => {
  beforeEach(() => {
    auth.mockReset();
    getFavoriteItemPage.mockReset();
    logError.mockReset();
    auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("answers 401 without a session and reads nothing", async () => {
    auth.mockResolvedValue(null);

    const response = await callGet("");

    expect(response.status).toBe(401);
    expect(getFavoriteItemPage).not.toHaveBeenCalled();
  });

  it("reads the caller's page after the cursor, never cached", async () => {
    getFavoriteItemPage.mockResolvedValue({ rows: [], nextCursor: null });

    const response = await callGet(`?sort=newest&cursor=${NEWEST_CURSOR}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getFavoriteItemPage).toHaveBeenCalledExactlyOnceWith(
      "user-1",
      "newest",
      ["2026-03-01T10:00:00.000Z", "item-30"],
    );
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { rows: [], nextCursor: null },
      error: null,
    });
  });

  it("answers 400 for a cursor made for another sort", async () => {
    const response = await callGet(`?sort=a-z&cursor=${NEWEST_CURSOR}`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "invalidRequest",
    });
    expect(getFavoriteItemPage).not.toHaveBeenCalled();
  });

  it("answers 500 and logs when the read fails", async () => {
    getFavoriteItemPage.mockRejectedValue(new Error("db down"));

    const response = await callGet("");

    expect(response.status).toBe(500);
    expect(logError).toHaveBeenCalledOnce();
  });
});
