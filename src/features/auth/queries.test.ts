import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));

import { getSessionVersion } from "@/features/auth/queries";

describe("getSessionVersion", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("reads the version of the given user", async () => {
    findUnique.mockResolvedValue({ sessionVersion: 3 });

    await expect(getSessionVersion("user-1")).resolves.toBe(3);

    expect(findUnique.mock.calls[0][0].where).toEqual({ id: "user-1" });
  });

  it("keeps version 0 apart from a deleted user, whose token must not pass", async () => {
    findUnique.mockResolvedValueOnce({ sessionVersion: 0 });
    await expect(getSessionVersion("user-1")).resolves.toBe(0);

    findUnique.mockResolvedValueOnce(null);
    await expect(getSessionVersion("user-1")).resolves.toBeNull();
  });
});
