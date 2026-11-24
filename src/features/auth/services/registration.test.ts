import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  getAccountState: vi.fn(),
  checkEmailSend: vi.fn(),
  sendVerificationLink: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/features/auth/_internal/password", () => ({
  hashPassword: mocks.hashPassword,
}));
vi.mock("@/features/auth/queries", () => ({
  getAccountState: mocks.getAccountState,
}));
vi.mock("@/features/auth/services/email-rate-limit", () => ({
  checkEmailSend: mocks.checkEmailSend,
}));
vi.mock("@/features/auth/services/email-verification", () => ({
  sendVerificationLink: mocks.sendVerificationLink,
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: { user: { create: mocks.create } },
}));

import { registerAccount } from "@/features/auth/services/registration";
import { Prisma } from "@/generated/prisma/client";
import { fail, ok } from "@/lib/errors/action-result";
import { UNIQUE_VIOLATION_CODE } from "@/lib/postgres/prisma-errors";

const ORIGIN = "https://devstash.example";
const INPUT = { name: "Ada", email: "ada@example.com", password: "a password" };

const register = () => registerAccount(INPUT, ORIGIN, "203.0.113.1", "en");

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("failed", {
    code,
    clientVersion: "test",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.hashPassword.mockResolvedValue("the-hash");
  mocks.getAccountState.mockResolvedValue(null);
  mocks.checkEmailSend.mockResolvedValue({ status: "allowed" });
  mocks.sendVerificationLink.mockResolvedValue(ok());
});

describe("registerAccount for a new address", () => {
  it("stores the hash, never the password, and sends the link", async () => {
    await register();

    expect(mocks.create).toHaveBeenCalledWith({
      data: { name: "Ada", email: INPUT.email, password: "the-hash" },
    });
    expect(mocks.sendVerificationLink).toHaveBeenCalledWith(
      INPUT.email,
      ORIGIN,
      "en",
    );
  });

  it("leaves the link to the parallel registration that won the race", async () => {
    mocks.create.mockRejectedValue(prismaError(UNIQUE_VIOLATION_CODE));

    await expect(register()).resolves.toBeUndefined();
    expect(mocks.sendVerificationLink).not.toHaveBeenCalled();
  });

  it("throws any other failure of the create", async () => {
    mocks.create.mockRejectedValue(prismaError("P2024"));

    await expect(register()).rejects.toThrow();
    expect(mocks.sendVerificationLink).not.toHaveBeenCalled();
  });
});

// The outcome must not tell a new address from a registered one.
describe("registerAccount for an existing address", () => {
  const pending = { hasPassword: true, isEmailVerified: false };

  it.each([
    ["a verified account", { hasPassword: true, isEmailVerified: true }],
    ["a GitHub account", { hasPassword: false, isEmailVerified: false }],
  ])("changes nothing and sends nothing for %s", async (_name, account) => {
    mocks.getAccountState.mockResolvedValue(account);

    await expect(register()).resolves.toBeUndefined();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.checkEmailSend).not.toHaveBeenCalled();
    expect(mocks.sendVerificationLink).not.toHaveBeenCalled();
  });

  it("sends a pending account a fresh link and keeps its password", async () => {
    mocks.getAccountState.mockResolvedValue(pending);

    await expect(register()).resolves.toBeUndefined();
    expect(mocks.sendVerificationLink).toHaveBeenCalledOnce();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each(["address-limited", "ip-limited"])(
    "answers the same when the send is %s",
    async (status) => {
      mocks.getAccountState.mockResolvedValue(pending);
      mocks.checkEmailSend.mockResolvedValue({ status, reset: 0 });

      await expect(register()).resolves.toBeUndefined();
      expect(mocks.sendVerificationLink).not.toHaveBeenCalled();
    },
  );

  it("answers the same when the email fails to send", async () => {
    mocks.getAccountState.mockResolvedValue(pending);
    mocks.sendVerificationLink.mockResolvedValue(fail("emailSendFailed"));
    await expect(register()).resolves.toBeUndefined();

    mocks.getAccountState.mockResolvedValue(null);
    await expect(register()).resolves.toBeUndefined();
  });

  // Without it the time of the answer would tell the two apart.
  it("hashes the password before the lookup, for both", async () => {
    mocks.getAccountState.mockResolvedValue(pending);

    await register();

    expect(mocks.hashPassword.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getAccountState.mock.invocationCallOrder[0],
    );
  });
});
