import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const getSearchIndex = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/search/services/search-index", () => ({ getSearchIndex }));

import { GET } from "@/app/api/search/route";

describe("GET /api/search", () => {
  beforeEach(() => {
    auth.mockReset();
    getSearchIndex.mockReset();
    auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("answers 401 without a session and never reads the index", async () => {
    auth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getSearchIndex).not.toHaveBeenCalled();
  });

  it("answers with the caller's index, kept out of shared caches", async () => {
    const index = {
      items: [],
      collections: [{ id: "col-1", name: "React", itemCount: 2 }],
    };
    getSearchIndex.mockResolvedValue(index);

    const response = await GET();

    expect(getSearchIndex).toHaveBeenCalledWith("user-1");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      success: true,
      data: index,
      error: null,
    });
  });

  it("answers 500 with a plain message when the read fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getSearchIndex.mockRejectedValue(new Error("connection lost"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      data: null,
      error: "Something went wrong",
    });
  });
});
