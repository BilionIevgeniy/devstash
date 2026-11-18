import { beforeEach, describe, expect, it } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import { replaceToken } from "@/features/auth/_internal/services/token-store";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import { deleteExpiredTokens } from "@/features/auth/services/retention";
import { prisma } from "@/lib/postgres/prisma";

// Expired tokens of A go, B's unused token (a fixture row that has not
// expired) stays, through both the daily job and the clean-up that runs when
// A asks for a new link.
let t: Tenants;
const HOUR = 60 * 60 * 1000;

beforeEach(async () => {
  t = await seedTenants();
});

async function expiredTokenOf(identifier: string, token: string) {
  await prisma.verificationToken.create({
    data: { identifier, token, expires: new Date(Date.now() - HOUR) },
  });
}

function tokensOf(identifiers: string[]) {
  return prisma.verificationToken.findMany({
    where: { identifier: { in: identifiers } },
    select: { identifier: true },
  });
}

describe("deleteExpiredTokens", () => {
  it("deletes A's expired tokens and keeps B's unused one, also when run twice", async () => {
    await expiredTokenOf(t.a.email, "expired-a");
    await expiredTokenOf(getPasswordResetIdentifier(t.a.email), "expired-a-2");
    const before = await snapshotTenant(t.b.userId);

    await expect(deleteExpiredTokens(new Date())).resolves.toEqual({
      deleted: 2,
    });
    await expect(deleteExpiredTokens(new Date())).resolves.toEqual({
      deleted: 0,
    });

    await expect(
      tokensOf([t.a.email, getPasswordResetIdentifier(t.a.email)]),
    ).resolves.toEqual([]);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

describe("replaceToken", () => {
  it("removes the expired tokens of A's address with the new one, and none of B's", async () => {
    await expiredTokenOf(getPasswordResetIdentifier(t.a.email), "expired-a");
    const before = await snapshotTenant(t.b.userId);
    const now = new Date();

    await replaceToken(
      t.a.email,
      t.a.email,
      new Date(now.getTime() + HOUR),
      now,
    );

    await expect(
      tokensOf([t.a.email, getPasswordResetIdentifier(t.a.email)]),
    ).resolves.toEqual([{ identifier: t.a.email }]);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});
