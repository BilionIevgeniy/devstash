import { beforeAll, describe, expect, it } from "vitest";
import { seedTenants, type Tenants } from "../../../test/integration/fixtures";
import {
  getDeletionCredentials,
  getGitHubAccessTokens,
  getPasswordHash,
} from "@/features/auth/_internal/queries";
import { getSessionVersion, getUserProfile } from "@/features/auth/queries";
import { prisma } from "@/lib/prisma";

// The reads of `auth` keyed by a user id, public and `_internal` together: each
// answers with the caller's own row. The reads keyed by email or a one-time
// token run before sign-in and have no other user to confuse.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
  await prisma.account.create({
    data: {
      userId: t.b.userId,
      type: "oauth",
      provider: "github",
      providerAccountId: "gh-b",
      access_token: "gho_token_of_b",
    },
  });
});

describe("reads of the caller's own user row", () => {
  it("getUserProfile and getSessionVersion", async () => {
    await expect(getUserProfile(t.a.userId)).resolves.toMatchObject({
      email: t.a.email,
      hasPassword: true,
    });
    await expect(getUserProfile(t.b.userId)).resolves.toMatchObject({
      email: t.b.email,
    });
    // The fixture gives A 0 and B 1, so a read by the wrong id shows here.
    await expect(getSessionVersion(t.a.userId)).resolves.toBe(0);
    await expect(getSessionVersion(t.b.userId)).resolves.toBe(1);
  });

  it("getPasswordHash and getDeletionCredentials", async () => {
    const hashOfA = await getPasswordHash(t.a.userId);
    const hashOfB = await getPasswordHash(t.b.userId);
    expect(hashOfA).toMatch(/^\$2/);
    expect(hashOfA).not.toBe(hashOfB);
    await expect(getDeletionCredentials(t.a.userId)).resolves.toEqual({
      email: t.a.email,
      password: hashOfA,
    });
  });

  it("getGitHubAccessTokens", async () => {
    await expect(getGitHubAccessTokens(t.b.userId)).resolves.toEqual([
      "gho_token_of_b",
    ]);
    await expect(getGitHubAccessTokens(t.a.userId)).resolves.toEqual([]);
  });
});
