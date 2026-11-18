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
  verifyStaleRegistration,
} from "@/features/auth/services/account";
import { hashToken } from "@/features/auth/_internal/token";
import { getAccountDeletionIdentifier } from "@/features/auth/domain/account-deletion";
import { sendAccountDeletionLink } from "@/features/auth/services/account-deletion-link";
import { prisma } from "@/lib/postgres/prisma";

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

// Accounts with no password (GitHub only) confirm a delete with the token of
// the emailed link: the token of B's address never confirms A's delete.
describe("deletion link", () => {
  async function withoutPassword(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { password: null },
    });
  }

  async function deletionToken(email: string, token: string) {
    await prisma.verificationToken.create({
      data: {
        identifier: getAccountDeletionIdentifier(email),
        token: hashToken(token),
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  }

  it("sends A's link to A's address only", async () => {
    await withoutPassword(t.a.userId);
    const before = await snapshotTenant(t.b.userId);

    const result = await sendAccountDeletionLink(
      t.a.userId,
      "https://devstash.test",
      "en",
    );

    expect(result.success).toBe(true);
    await expect(
      prisma.verificationToken.count({
        where: { identifier: getAccountDeletionIdentifier(t.a.email) },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.verificationToken.count({
        where: { identifier: getAccountDeletionIdentifier(t.b.email) },
      }),
    ).resolves.toBe(0);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  it("confirms B's delete with B's token, and refuses A with it", async () => {
    await withoutPassword(t.a.userId);
    await withoutPassword(t.b.userId);
    await deletionToken(t.b.email, "token-for-b");
    const before = await snapshotTenant(t.b.userId);

    const owner = await verifyAccountDeletion(t.b.userId, {
      deletionToken: "token-for-b",
    });
    expect(owner.data?.userId).toBe(t.b.userId);

    const stranger = await verifyAccountDeletion(t.a.userId, {
      deletionToken: "token-for-b",
    });
    expect(stranger).toMatchObject({
      success: false,
      error: "invalidDeletionLink",
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

// The daily job's delete re-checks the registration in its own transaction: a
// verification after the proof keeps the user and the tokens of the address.
describe("stale registration", () => {
  it("keeps a user verified between the proof and the delete", async () => {
    const createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: { email: "late@example.com", password: "hash", createdAt },
    });
    await prisma.verificationToken.create({
      data: {
        identifier: "password-reset:late@example.com",
        token: "token-of-late",
        expires: new Date(Date.now() + 60_000),
      },
    });

    const verified = await verifyStaleRegistration(user.id, new Date());
    expect(verified?.userId).toBe(user.id);
    if (!verified) return;
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
    await deleteVerifiedUserRows(verified);

    await expect(prisma.user.count({ where: { id: user.id } })).resolves.toBe(
      1,
    );
    await expect(
      prisma.verificationToken.count({
        where: { identifier: "password-reset:late@example.com" },
      }),
    ).resolves.toBe(1);
  });

  it("gives no proof for a verified tenant", async () => {
    await expect(
      verifyStaleRegistration(t.a.userId, new Date()),
    ).resolves.toBeNull();
  });
});
