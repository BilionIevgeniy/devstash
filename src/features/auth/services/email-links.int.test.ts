import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PASSWORD_OF_A,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { verifyPassword } from "@/features/auth/_internal/password";
import { hashToken } from "@/features/auth/_internal/token";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import { confirmEmailAddress } from "@/features/auth/services/email-verification";
import { resetPasswordWithToken } from "@/features/auth/services/password-reset";
import { prisma } from "@/lib/postgres/prisma";
import { consumeRateLimit } from "@/lib/vendors/rate-limit";

// The links of two addresses side by side: a link is used once, by its own
// address, and leaves the other's link and account as they were.
let t: Tenants;
const HOUR = 60 * 60 * 1000;

async function tokenOf(identifier: string, token: string, inMs = HOUR) {
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires: new Date(Date.now() + inMs),
    },
  });
}

const userOf = (userId: string) =>
  prisma.user.findUniqueOrThrow({ where: { id: userId } });
const isThere = async (token: string) =>
  (await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  })) !== null;

beforeEach(async () => {
  t = await seedTenants();
});

describe("confirmEmailAddress", () => {
  beforeEach(async () => {
    await prisma.user.updateMany({ data: { emailVerified: null } });
    await tokenOf(t.a.email, "link-of-a");
    await tokenOf(t.b.email, "link-of-b");
  });

  const confirm = (token: string, password = PASSWORD_OF_A) =>
    confirmEmailAddress(t.a.email, token, password);

  it("verifies A once, and neither B nor B's link", async () => {
    await expect(confirm("link-of-a")).resolves.toMatchObject({
      success: true,
    });

    expect((await userOf(t.a.userId)).emailVerified).not.toBeNull();
    expect((await userOf(t.b.userId)).emailVerified).toBeNull();
    expect(await isThere("link-of-a")).toBe(false);
    expect(await isThere("link-of-b")).toBe(true);
    await expect(confirm("link-of-a")).resolves.toMatchObject({
      error: "invalidVerificationLink",
    });
  });

  it("refuses B's link for A's address", async () => {
    await expect(confirm("link-of-b")).resolves.toMatchObject({
      error: "invalidVerificationLink",
    });
    expect((await userOf(t.a.userId)).emailVerified).toBeNull();
  });

  it("wants the password the account was created with, and keeps the link", async () => {
    await expect(confirm("link-of-a", "wrong-password")).resolves.toMatchObject(
      { error: "wrongConfirmPassword" },
    );
    expect((await userOf(t.a.userId)).emailVerified).toBeNull();
    expect(await isThere("link-of-a")).toBe(true);
  });

  it("refuses an expired link", async () => {
    await tokenOf(t.a.email, "expired-of-a", -HOUR);
    await expect(confirm("expired-of-a")).resolves.toMatchObject({
      error: "invalidVerificationLink",
    });
    expect((await userOf(t.a.userId)).emailVerified).toBeNull();
  });

  it("stops after too many attempts, before the password is checked", async () => {
    vi.mocked(consumeRateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + HOUR,
    });
    await expect(confirm("link-of-a")).resolves.toMatchObject({
      error: "tooManyAttempts",
    });
    expect((await userOf(t.a.userId)).emailVerified).toBeNull();
  });
});

describe("resetPasswordWithToken", () => {
  it("sets A's password once, and leaves B's link and password", async () => {
    await tokenOf(getPasswordResetIdentifier(t.a.email), "reset-of-a");
    await tokenOf(getPasswordResetIdentifier(t.b.email), "reset-of-b");
    const before = await userOf(t.b.userId);
    const reset = () =>
      resetPasswordWithToken(t.a.email, "reset-of-a", "a-new-password-1");

    await expect(reset()).resolves.toMatchObject({ success: true });

    const a = await userOf(t.a.userId);
    expect(await verifyPassword("a-new-password-1", a.password ?? "")).toBe(
      true,
    );
    expect(await isThere("reset-of-a")).toBe(false);
    expect(await isThere("reset-of-b")).toBe(true);
    expect(await userOf(t.b.userId)).toEqual(before);
    await expect(reset()).resolves.toMatchObject({ error: "invalidResetLink" });
  });
});
