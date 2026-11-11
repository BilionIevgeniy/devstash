import { beforeEach, describe, expect, it } from "vitest";
import {
  seedTenants,
  PASSWORD_OF_A,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import {
  changeUserPassword,
  deleteVerifiedUserRows,
  verifyAccountDeletion,
} from "@/features/auth/services/account";
import { prisma } from "@/lib/prisma";

// A changes or deletes its own account: the writes are keyed by A's id and
// A's email, so B's hash, session version and verification token stay.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

describe("changeUserPassword", () => {
  it("changes A's password and session version only", async () => {
    const before = await snapshotTenant(t.b.userId);
    const result = await changeUserPassword(
      t.a.userId,
      PASSWORD_OF_A,
      "a-new-password-123",
    );
    expect(result.success).toBe(true);
    const a = await prisma.user.findUniqueOrThrow({
      where: { id: t.a.userId },
    });
    expect(a.sessionVersion).toBe(1);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

describe("deleteVerifiedUserRows", () => {
  it("deletes A and A's tokens, and none of B's rows", async () => {
    await prisma.verificationToken.create({
      data: {
        identifier: t.a.email,
        token: "token-of-a",
        expires: new Date(Date.now() + 60_000),
      },
    });
    const before = await snapshotTenant(t.b.userId);

    const verified = await verifyAccountDeletion(t.a.userId, {
      password: PASSWORD_OF_A,
    });
    expect(verified.data).not.toBeNull();
    if (!verified.data) return;
    await deleteVerifiedUserRows(verified.data);

    await expect(
      prisma.user.findUnique({ where: { id: t.a.userId } }),
    ).resolves.toBeNull();
    await expect(
      prisma.verificationToken.count({ where: { identifier: t.a.email } }),
    ).resolves.toBe(0);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});
