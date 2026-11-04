import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const getCollectionOptions = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));
vi.mock("@/features/collections/queries", () => ({ getCollectionOptions }));

import { GET } from "@/app/api/collections/route";

describe("GET /api/collections", () => {
  beforeEach(() => {
    auth.mockReset();
    getCollectionOptions.mockReset();
    auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("answers 401 without a session and never reads the collections", async () => {
    auth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getCollectionOptions).not.toHaveBeenCalled();
  });

  // The item forms read this body as ItemCollectionRef, across a rank the
  // compiler cannot see through (ADR 0008).
  it("answers with the caller's collections as id and name", async () => {
    getCollectionOptions.mockResolvedValue([{ id: "col-1", name: "React" }]);

    const response = await GET();

    expect(getCollectionOptions).toHaveBeenCalledWith("user-1");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      success: true,
      data: [{ id: "col-1", name: "React" }],
      error: null,
    });
  });

  it("answers an empty list, not a failure, for a user with no collections", async () => {
    getCollectionOptions.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([]);
  });

  it("answers 500 when the read fails", async () => {
    getCollectionOptions.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(500);
  });
});
