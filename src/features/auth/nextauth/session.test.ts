import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/features/auth/nextauth/auth", () => ({ auth }));

import { getSignedInUserId } from "@/features/auth/nextauth/session";

// Routes answer 401 themselves: this never redirects.
describe("getSignedInUserId", () => {
  beforeEach(() => {
    auth.mockReset();
  });

  it("is the id of the signed-in user", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(getSignedInUserId()).resolves.toBe("user-1");
  });

  it.each([
    ["no session", null],
    ["a session without a user", {}],
    ["a user without an id", { user: {} }],
  ])("is null for %s, without a redirect", async (_name, session) => {
    auth.mockResolvedValue(session);

    await expect(getSignedInUserId()).resolves.toBeNull();
  });
});
