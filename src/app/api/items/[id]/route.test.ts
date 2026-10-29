import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const getItemDetail = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/items/queries", () => ({ getItemDetail }));

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
    getItemDetail.mockReset();
    auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("answers 401 without a session and never reads the item", async () => {
    auth.mockResolvedValue(null);

    const response = await callGet(VALID_ID);

    expect(response.status).toBe(401);
    expect(getItemDetail).not.toHaveBeenCalled();
  });

  it("answers 400 for an id that is not a cuid", async () => {
    const response = await callGet("not-an-id");

    expect(response.status).toBe(400);
    expect(getItemDetail).not.toHaveBeenCalled();
  });

  it("answers 404 when the item is missing or someone else's", async () => {
    getItemDetail.mockResolvedValue(null);

    const response = await callGet(VALID_ID);

    expect(response.status).toBe(404);
    expect(getItemDetail).toHaveBeenCalledWith("user-1", VALID_ID);
  });

  it("returns the item for its owner", async () => {
    getItemDetail.mockResolvedValue({ id: VALID_ID, title: "useAuth Hook" });

    const response = await callGet(VALID_ID);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { id: VALID_ID, title: "useAuth Hook" },
      error: null,
    });
  });
});
