import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkEmailSend: vi.fn(),
  getAccountState: vi.fn(),
  isPasswordResetTokenValid: vi.fn(),
  hashPassword: vi.fn(),
  replaceToken: vi.fn(),
  sendEmail: vi.fn(),
  tx: {
    verificationToken: { findUnique: vi.fn(), deleteMany: vi.fn() },
    user: { update: vi.fn() },
  },
  error: vi.fn(async () => {}),
}));
vi.mock("@/features/auth/services/email-rate-limit", () => ({
  checkEmailSend: mocks.checkEmailSend,
}));
vi.mock("@/features/auth/queries", () => ({
  getAccountState: mocks.getAccountState,
  isPasswordResetTokenValid: mocks.isPasswordResetTokenValid,
}));
vi.mock("@/features/auth/_internal/password", () => ({
  hashPassword: mocks.hashPassword,
}));
vi.mock("@/features/auth/_internal/services/token-store", () => ({
  replaceToken: mocks.replaceToken,
}));
vi.mock("@/lib/vendors/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error: mocks.error, warn: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: {
    $transaction: (run: (tx: typeof mocks.tx) => unknown) => run(mocks.tx),
  },
}));

import { hashToken } from "@/features/auth/_internal/token";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import {
  requestPasswordResetLink,
  resetPasswordWithToken,
} from "@/features/auth/services/password-reset";
import { fail, ok } from "@/lib/errors/action-result";

const ORIGIN = "https://devstash.example";
const EMAIL = "ada@example.com";
const TOKEN = "the-token";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.checkEmailSend.mockResolvedValue({ status: "allowed" });
  mocks.replaceToken.mockResolvedValue(TOKEN);
  mocks.sendEmail.mockResolvedValue(ok());
});

function request(email: string) {
  return requestPasswordResetLink(email, ORIGIN, "203.0.113.1", "en");
}

describe("requestPasswordResetLink", () => {
  it("sends the link to an account with a password", async () => {
    mocks.getAccountState.mockResolvedValue({
      hasPassword: true,
      isEmailVerified: true,
    });

    expect(await request(EMAIL)).toEqual(ok());
    const [{ to, html }] = mocks.sendEmail.mock.calls[0] as [
      { to: string; html: string },
    ];
    expect(to).toBe(EMAIL);
    expect(html).toContain(`token=${TOKEN}`);
  });

  // Any difference would tell a stranger which addresses have an account.
  it.each([
    ["no account", null],
    [
      "an account that signs in with GitHub only",
      { hasPassword: false, isEmailVerified: true },
    ],
  ])("answers the same for %s, and sends nothing", async (_name, account) => {
    mocks.getAccountState.mockResolvedValue(account);

    expect(await request("nobody@example.com")).toEqual(ok());
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("answers the same when the email fails to send or the token is not stored", async () => {
    mocks.getAccountState.mockResolvedValue({
      hasPassword: true,
      isEmailVerified: true,
    });
    mocks.sendEmail.mockResolvedValue(fail("emailSendFailed"));
    expect(await request(EMAIL)).toEqual(ok());

    mocks.replaceToken.mockRejectedValue(new Error("database down"));
    expect(await request(EMAIL)).toEqual(ok());
  });

  it("answers the same for an address that had its email this minute", async () => {
    mocks.checkEmailSend.mockResolvedValue({ status: "address-limited" });

    expect(await request(EMAIL)).toEqual(ok());
    expect(mocks.getAccountState).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("refuses openly only a client address that used up its sends", async () => {
    mocks.checkEmailSend.mockResolvedValue({
      status: "ip-limited",
      reset: Date.now() + 60_000,
    });

    expect(await request(EMAIL)).toMatchObject({
      success: false,
      error: "tooManyAttempts",
    });
    expect(mocks.getAccountState).not.toHaveBeenCalled();
  });
});

describe("resetPasswordWithToken", () => {
  const record = {
    identifier: getPasswordResetIdentifier(EMAIL),
    token: hashToken(TOKEN),
    expires: new Date(Date.now() + 60_000),
  };

  beforeEach(() => {
    mocks.isPasswordResetTokenValid.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue("new-hash");
    mocks.tx.verificationToken.findUnique.mockResolvedValue(record);
    mocks.tx.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
  });

  const reset = () => resetPasswordWithToken(EMAIL, TOKEN, "new password");

  it("sets the password and ends every session of the account", async () => {
    expect(await reset()).toEqual(ok());
    expect(mocks.tx.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { token: hashToken(TOKEN) },
    });
    expect(mocks.tx.user.update).toHaveBeenCalledWith({
      where: { email: EMAIL },
      data: { password: "new-hash", sessionVersion: { increment: 1 } },
    });
  });

  it("pays no bcrypt hash for a token the gate refuses", async () => {
    mocks.isPasswordResetTokenValid.mockResolvedValue(false);

    expect(await reset()).toEqual(fail("invalidResetLink"));
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.tx.user.update).not.toHaveBeenCalled();
  });

  // Two requests with one link pass the gate together; the delete decides.
  it("sets no password when another request used the token first", async () => {
    mocks.tx.verificationToken.deleteMany.mockResolvedValue({ count: 0 });

    expect(await reset()).toEqual(fail("invalidResetLink"));
    expect(mocks.tx.user.update).not.toHaveBeenCalled();
  });

  it.each([
    ["is gone", null],
    ["has expired", { ...record, expires: new Date(Date.now() - 1) }],
    [
      "belongs to another address",
      { ...record, identifier: getPasswordResetIdentifier("eve@example.com") },
    ],
    ["is a verification token", { ...record, identifier: EMAIL }],
  ])("sets no password when the token %s", async (_name, found) => {
    mocks.tx.verificationToken.findUnique.mockResolvedValue(found);

    expect(await reset()).toEqual(fail("invalidResetLink"));
    expect(mocks.tx.verificationToken.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.user.update).not.toHaveBeenCalled();
  });

  it("answers a failure of the database as a plain failure", async () => {
    mocks.tx.user.update.mockRejectedValue(new Error("database down"));

    expect(await reset()).toEqual(fail("generic"));
    expect(mocks.error).toHaveBeenCalledOnce();
  });
});
