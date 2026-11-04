import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique }, account: { findMany } },
}));

import {
  getCredentialsUser,
  getDeletionCredentials,
  getGitHubAccessTokens,
  getPasswordHash,
  getPasswordHashByEmail,
} from "@/features/auth/_internal/queries";

beforeEach(() => {
  findUnique.mockReset().mockResolvedValue(null);
  findMany.mockReset().mockResolvedValue([]);
});

describe("getPasswordHash", () => {
  it("reads the hash of the given user", async () => {
    findUnique.mockResolvedValue({ password: "hash" });

    await expect(getPasswordHash("user-1")).resolves.toBe("hash");

    expect(findUnique.mock.calls[0][0].where).toEqual({ id: "user-1" });
  });

  it("returns null for a missing user", async () => {
    await expect(getPasswordHash("user-1")).resolves.toBeNull();
  });
});

describe("getPasswordHashByEmail", () => {
  it("reads the hash of the given address", async () => {
    findUnique.mockResolvedValue({ password: "hash" });

    await expect(getPasswordHashByEmail("ada@example.com")).resolves.toBe(
      "hash",
    );

    expect(findUnique.mock.calls[0][0].where).toEqual({
      email: "ada@example.com",
    });
  });

  it("returns null for a missing account", async () => {
    await expect(getPasswordHashByEmail("ada@example.com")).resolves.toBeNull();
  });
});

describe("getDeletionCredentials", () => {
  it("reads only the email and the hash of the given user", async () => {
    await getDeletionCredentials("user-1");

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { email: true, password: true },
    });
  });
});

describe("getCredentialsUser", () => {
  it("reads only the fields sign-in needs", async () => {
    await getCredentialsUser("ada@example.com");

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "ada@example.com" },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        emailVerified: true,
      },
    });
  });
});

describe("getGitHubAccessTokens", () => {
  it("reads only the GitHub accounts of the given user", async () => {
    await getGitHubAccessTokens("user-1");

    expect(findMany.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      provider: "github",
    });
  });

  it("leaves out accounts with no stored token", async () => {
    findMany.mockResolvedValue([
      { access_token: "token-1" },
      { access_token: null },
      { access_token: "" },
      { access_token: "token-2" },
    ]);

    await expect(getGitHubAccessTokens("user-1")).resolves.toEqual([
      "token-1",
      "token-2",
    ]);
  });
});
