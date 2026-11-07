import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const openUserItem = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/items/services/item-detail", () => ({ openUserItem }));

import { GET } from "@/app/api/items/[id]/route";

const VALID_ID = "cmh8x2k9p0000abcd1234efgh";

function callGet(id: string) {
  return GET(new Request(`http://localhost/api/items/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /api/items/[id]", () => {
  beforeEach(() => {
    auth.mockReset();
    openUserItem.mockReset();
    auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("answers 401 without a session and never reads the item", async () => {
    auth.mockResolvedValue(null);

    const response = await callGet(VALID_ID);

    expect(response.status).toBe(401);
    expect(openUserItem).not.toHaveBeenCalled();
  });

  it("answers 400 for an id that is not a cuid", async () => {
    const response = await callGet("not-an-id");

    expect(response.status).toBe(400);
    expect(openUserItem).not.toHaveBeenCalled();
  });

  it("answers 404 when the item is missing or someone else's", async () => {
    openUserItem.mockResolvedValue({ status: "missing" });

    const response = await callGet(VALID_ID);

    expect(response.status).toBe(404);
    expect(openUserItem).toHaveBeenCalledWith("user-1", VALID_ID);
  });

  it("answers 403 for an item the plan does not give", async () => {
    openUserItem.mockResolvedValue({ status: "locked" });

    const response = await callGet(VALID_ID);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ data: null });
  });

  it("returns the item for its owner", async () => {
    openUserItem.mockResolvedValue({
      status: "ok",
      item: { id: VALID_ID, title: "useAuth Hook" },
      canUseAi: true,
    });

    const response = await callGet(VALID_ID);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { item: { id: VALID_ID, title: "useAuth Hook" }, canUseAi: true },
      error: null,
    });
  });

  // The answer holds the user's content and signed URLs.
  it("keeps the answer out of every cache", async () => {
    openUserItem.mockResolvedValue({
      status: "ok",
      item: { id: VALID_ID, title: "x" },
      canUseAi: false,
    });

    const response = await callGet(VALID_ID);

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
