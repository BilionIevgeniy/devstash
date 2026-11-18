import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: { user: { findUnique } },
}));

import {
  getCredentialsUser,
  getDeletionCredentials,
  getPasswordHash,
  getPasswordHashByEmail,
} from "@/features/auth/_internal/queries";

beforeEach(() => {
  findUnique.mockReset().mockResolvedValue(null);
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
