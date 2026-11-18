import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUnique,
  updateUser,
  deleteUser,
  findAccounts,
  deleteTokens,
  transaction,
  consumeRateLimit,
  resetRateLimit,
  compare,
  hash,
  revokeGitHubGrant,
  isAccountDeletionTokenValid,
} = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  findAccounts: vi.fn(),
  deleteTokens: vi.fn(),
  transaction: vi.fn(),
  consumeRateLimit: vi.fn(),
  resetRateLimit: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
  revokeGitHubGrant: vi.fn(),
  isAccountDeletionTokenValid: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: {
    user: { findUnique, update: updateUser, delete: deleteUser },
    account: { findMany: findAccounts },
    verificationToken: { deleteMany: deleteTokens },
    $transaction: transaction,
  },
}));
vi.mock("@/lib/vendors/rate-limit", () => ({
  consumeRateLimit,
  resetRateLimit,
}));
vi.mock("@/features/auth/queries", () => ({ isAccountDeletionTokenValid }));
vi.mock("bcryptjs", () => ({ default: { compare, hash } }));
vi.mock("@/features/auth/_internal/services/github-grant", () => ({
  revokeGitHubGrant,
}));

import { DUMMY_PASSWORD_HASH } from "@/features/auth/_internal/password";
import { getAccountDeletionIdentifier } from "@/features/auth/domain/account-deletion";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import {
  changeUserPassword,
  deleteVerifiedUserRows,
  verifyAccountDeletion,
  verifyPasswordByEmail,
  type VerifiedDeletion,
} from "@/features/auth/services/account";

const passwordUser = { email: "ada@example.com", password: "hash" };

describe("changeUserPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: 0,
    });
    findUnique.mockResolvedValue({ password: "old-hash" });
    compare.mockResolvedValue(true);
    hash.mockResolvedValue("new-hash");
  });

  it("stores the new hash, revokes other sessions and resets the counter", async () => {
    const result = await changeUserPassword("user-1", "old", "new");

    expect(result).toEqual({ success: true, error: null, data: null });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "new-hash", sessionVersion: { increment: 1 } },
    });
    expect(resetRateLimit).toHaveBeenCalledTimes(1);
  });

  it("refuses a wrong current password and keeps the counter", async () => {
    compare.mockResolvedValue(false);

    const result = await changeUserPassword("user-1", "nope", "new");

    expect(result.success).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
    expect(resetRateLimit).not.toHaveBeenCalled();
  });

  it("refuses an account with no password", async () => {
    findUnique.mockResolvedValue({ password: null });

    const result = await changeUserPassword("user-1", "old", "new");

    expect(result.success).toBe(false);
    expect(compare).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("refuses before reading the user when the attempts are used up", async () => {
    consumeRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const result = await changeUserPassword("user-1", "old", "new");

    expect(result.success).toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("verifyPasswordByEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    compare.mockResolvedValue(true);
  });

  it("checks the password against the account's hash", async () => {
    findUnique.mockResolvedValue({ password: "hash" });

    await expect(verifyPasswordByEmail("ada@example.com", "pw")).resolves.toBe(
      true,
    );
    expect(compare).toHaveBeenCalledWith("pw", "hash");
  });

  it("pays the same bcrypt round for a missing account and refuses it", async () => {
    findUnique.mockResolvedValue(null);

    await expect(verifyPasswordByEmail("ada@example.com", "pw")).resolves.toBe(
      false,
    );
    expect(compare).toHaveBeenCalledWith("pw", DUMMY_PASSWORD_HASH);
  });
});

describe("deleteVerifiedUserRows", () => {
  const proof = {
    userId: "user-1",
    email: "ada@example.com",
  } as VerifiedDeletion;

  beforeEach(() => {
    vi.clearAllMocks();
    findAccounts.mockResolvedValue([]);
  });

  it("revokes every stored GitHub token before the rows go", async () => {
    findAccounts.mockResolvedValue([
      { access_token: "token-1" },
      { access_token: null },
      { access_token: "token-2" },
    ]);

    await deleteVerifiedUserRows(proof);

    expect(revokeGitHubGrant.mock.calls).toEqual([["token-1"], ["token-2"]]);
    expect(revokeGitHubGrant.mock.invocationCallOrder[1]).toBeLessThan(
      transaction.mock.invocationCallOrder[0],
    );
  });

  it("removes the user and every kind of token in one transaction", async () => {
    await deleteVerifiedUserRows(proof);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(deleteTokens.mock.calls[0][0].where).toEqual({
      identifier: {
        in: [
          "ada@example.com",
          getPasswordResetIdentifier("ada@example.com"),
          getAccountDeletionIdentifier("ada@example.com"),
        ],
      },
    });
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });
});

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

  it("refuses an account without a password that brings no or a bad link token", async () => {
    findUnique.mockResolvedValue({ email: "ada@example.com", password: null });
    isAccountDeletionTokenValid.mockResolvedValue(false);

    const missing = await verifyAccountDeletion("user-1", {});
    const expired = await verifyAccountDeletion("user-1", {
      deletionToken: "old",
    });

    for (const result of [missing, expired]) {
      expect(result).toEqual({
        success: false,
        data: null,
        error: "invalidDeletionLink",
      });
    }
  });

  // The address comes from the account, never from the link, so a token sent
  // to another address cannot confirm this account's delete.
  it("passes an account without a password with a token for its own address", async () => {
    findUnique.mockResolvedValue({ email: "ada@example.com", password: null });
    isAccountDeletionTokenValid.mockResolvedValue(true);

    const result = await verifyAccountDeletion("user-1", {
      deletionToken: "tok",
    });

    expect(result.success).toBe(true);
    expect(isAccountDeletionTokenValid).toHaveBeenCalledWith(
      "ada@example.com",
      "tok",
    );
  });

  it("does not let a link token stand in for the password of an account that has one", async () => {
    isAccountDeletionTokenValid.mockResolvedValue(true);

    const result = await verifyAccountDeletion("user-1", {
      deletionToken: "tok",
    });

    expect(result).toMatchObject({
      success: false,
      error: "incorrectPassword",
    });
    expect(isAccountDeletionTokenValid).not.toHaveBeenCalled();
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
