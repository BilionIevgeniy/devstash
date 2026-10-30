import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, consumeRateLimit, resetRateLimit, compare } = vi.hoisted(
  () => ({
    findUnique: vi.fn(),
    consumeRateLimit: vi.fn(),
    resetRateLimit: vi.fn(),
    compare: vi.fn(),
  }),
);
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit, resetRateLimit }));
vi.mock("bcryptjs", () => ({ default: { compare } }));
vi.mock("@/features/auth/_internal/services/github-grant", () => ({
  revokeGitHubGrant: vi.fn(),
}));

import { REAUTH_REQUIRED_MESSAGE } from "@/features/auth/domain/reauth";
import { verifyAccountDeletion } from "@/features/auth/services/account";

const passwordUser = { email: "ada@example.com", password: "hash" };

describe("verifyAccountDeletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: 0,
    });
    findUnique.mockResolvedValue(passwordUser);
    compare.mockResolvedValue(true);
  });

  it("passes the owner with the right password and resets the counter", async () => {
    const result = await verifyAccountDeletion("user-1", { password: "pw" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      userId: "user-1",
      email: "ada@example.com",
    });
    expect(resetRateLimit).toHaveBeenCalledTimes(1);
  });

  it("refuses a wrong or missing password without resetting the counter", async () => {
    compare.mockResolvedValue(false);
    const wrong = await verifyAccountDeletion("user-1", { password: "nope" });
    const missing = await verifyAccountDeletion("user-1", {});

    expect(wrong).toMatchObject({ success: false, data: null });
    expect(missing).toMatchObject({ success: false, data: null });
    expect(resetRateLimit).not.toHaveBeenCalled();
  });

  it("asks an account without a password for a fresh sign-in", async () => {
    findUnique.mockResolvedValue({ email: "ada@example.com", password: null });

    const result = await verifyAccountDeletion("user-1", {
      authenticatedAt: Date.now() - 24 * 60 * 60 * 1000,
    });

    expect(result).toEqual({
      success: false,
      error: REAUTH_REQUIRED_MESSAGE,
      data: null,
    });
  });

  it("passes an account without a password after a recent sign-in", async () => {
    findUnique.mockResolvedValue({ email: "ada@example.com", password: null });

    const result = await verifyAccountDeletion("user-1", {
      authenticatedAt: Date.now(),
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toBeNull();
  });

  it("answers success with nothing to delete when the user is gone", async () => {
    findUnique.mockResolvedValue(null);

    const result = await verifyAccountDeletion("user-1", { password: "pw" });

    expect(result).toEqual({ success: true, error: null, data: null });
  });

  it("refuses before reading the user when the attempts are used up", async () => {
    consumeRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const result = await verifyAccountDeletion("user-1", { password: "pw" });

    expect(result.success).toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
