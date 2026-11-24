import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkEmailSend, getAccountState, sendEmail, transaction } = vi.hoisted(
  () => ({
    checkEmailSend: vi.fn(),
    getAccountState: vi.fn(),
    sendEmail: vi.fn(),
    transaction: vi.fn(),
  }),
);
vi.mock("@/features/auth/services/email-rate-limit", () => ({
  checkEmailSend,
}));
vi.mock("@/features/auth/queries", () => ({
  getAccountState,
  isVerificationTokenValid: vi.fn(),
}));
vi.mock("@/features/auth/services/account", () => ({
  verifyPasswordByEmail: vi.fn(),
}));
vi.mock("@/lib/vendors/email", () => ({ sendEmail }));
vi.mock("@/lib/vendors/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
  resetRateLimit: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: {
    $transaction: transaction,
    verificationToken: { deleteMany: vi.fn(), create: vi.fn() },
  },
}));

import { resendVerificationLink } from "@/features/auth/services/email-verification";
import { fail, ok } from "@/lib/errors/action-result";
import { deferredTasks } from "../../../../test/deferred";

const ORIGIN = "https://devstash.example";

// The answer, then what runs after it.
async function resend(email: string) {
  const { defer, run } = deferredTasks();
  const answer = await resendVerificationLink(
    email,
    ORIGIN,
    "203.0.113.1",
    "en",
    defer,
  );
  await run();
  return answer;
}

describe("resendVerificationLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkEmailSend.mockResolvedValue({ status: "allowed" });
    transaction.mockResolvedValue([]);
  });

  // Only an address with a pending registration reaches the send, so a failure
  // answered as such would tell a stranger that the address has an account.
  it("answers the same for a pending account whose email fails to send as for no account", async () => {
    getAccountState.mockResolvedValue({
      hasPassword: true,
      isEmailVerified: false,
    });
    sendEmail.mockResolvedValue(fail("emailSendFailed"));
    const pending = await resend("pending@example.com");

    getAccountState.mockResolvedValue(null);
    const missing = await resend("nobody@example.com");

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(pending).toEqual(ok());
    expect(missing).toEqual(pending);
  });

  // The lookup and the send would be in the time of the answer.
  it("answers before it looks anything up", async () => {
    const { defer, count } = deferredTasks();

    await resendVerificationLink("a@example.com", ORIGIN, null, "en", defer);

    expect(count()).toBe(1);
    expect(getAccountState).not.toHaveBeenCalled();
  });

  it("still refuses openly when the client address has used up its sends", async () => {
    checkEmailSend.mockResolvedValue({
      status: "ip-limited",
      reset: Date.now() + 60_000,
    });

    const result = await resend("pending@example.com");

    expect(result).toMatchObject({ success: false, error: "tooManyAttempts" });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
