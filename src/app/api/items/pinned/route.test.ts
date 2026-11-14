import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const getPinnedGroupPage = vi.hoisted(() => vi.fn());
const logError = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/items/queries/lists", () => ({ getPinnedGroupPage }));
vi.mock("@/lib/logger", () => ({
  logger: { error: logError, warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "@/app/api/items/pinned/route";
import { encodeListCursor } from "@/features/items/domain/list-cursor";

function callGet(query: string) {
  return GET(new Request(`http://localhost/api/items/pinned${query}`));
}

describe("GET /api/items/pinned", () => {
  beforeEach(() => {
    auth.mockReset();
    getPinnedGroupPage.mockReset();
    logError.mockReset();
    auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("answers 401 without a session and reads nothing", async () => {
    auth.mockResolvedValue(null);

    const response = await callGet("?typeId=type-1");

    expect(response.status).toBe(401);
    expect(getPinnedGroupPage).not.toHaveBeenCalled();
  });

  it("answers 400 without a type", async () => {
    const response = await callGet("?sort=newest");

    expect(response.status).toBe(400);
    expect(getPinnedGroupPage).not.toHaveBeenCalled();
  });

  it("reads the next page of the caller's group, never cached", async () => {
    getPinnedGroupPage.mockResolvedValue({ rows: [], nextCursor: null });
    const cursor = encodeListCursor("a-z", ["Debounce", "item-10"]);

    const response = await callGet(`?typeId=type-1&sort=a-z&cursor=${cursor}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getPinnedGroupPage).toHaveBeenCalledExactlyOnceWith(
      "user-1",
      "type-1",
      "a-z",
      ["Debounce", "item-10"],
    );
  });

  it("answers 500 and logs when the read fails", async () => {
    getPinnedGroupPage.mockRejectedValue(new Error("db down"));

    const response = await callGet("?typeId=type-1");

    expect(response.status).toBe(500);
    expect(logError).toHaveBeenCalledOnce();
  });
});
