import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDeletionCredentials, consumeRateLimit, sendEmail, transaction } =
  vi.hoisted(() => ({
    getDeletionCredentials: vi.fn(),
    consumeRateLimit: vi.fn(),
    sendEmail: vi.fn(),
    transaction: vi.fn(),
  }));
vi.mock("@/features/auth/_internal/queries", () => ({
  getDeletionCredentials,
}));
vi.mock("@/lib/vendors/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/lib/vendors/email", () => ({ sendEmail }));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: {
    $transaction: transaction,
    verificationToken: { deleteMany: vi.fn(), create: vi.fn() },
  },
}));

import { sendAccountDeletionLink } from "@/features/auth/services/account-deletion-link";
import { ok } from "@/lib/errors/action-result";

const ORIGIN = "https://devstash.example";

describe("sendAccountDeletionLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDeletionCredentials.mockResolvedValue({
      email: "ada@example.com",
      password: null,
    });
    consumeRateLimit.mockResolvedValue({
      success: true,
      remaining: 2,
      reset: 0,
    });
    sendEmail.mockResolvedValue(ok());
    transaction.mockResolvedValue([]);
  });

  it("emails the account's own address a link to the confirmation page", async () => {
    const result = await sendAccountDeletionLink("user-1", ORIGIN, "en");

    expect(result).toEqual(ok());
    const [{ to, html }] = sendEmail.mock.calls[0] as [
      { to: string; html: string },
    ];
    expect(to).toBe("ada@example.com");
    expect(html).toContain(`${ORIGIN}/settings/delete-account?token=`);
  });

  it("sends nothing to an account that confirms with its password", async () => {
    getDeletionCredentials.mockResolvedValue({
      email: "ada@example.com",
      password: "hash",
    });

    const result = await sendAccountDeletionLink("user-1", ORIGIN, "en");

    expect(result.success).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("refuses with the wait once the sends of the hour are used up", async () => {
    consumeRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 20 * 60_000,
    });

    const result = await sendAccountDeletionLink("user-1", ORIGIN, "en");

    expect(result).toMatchObject({
      success: false,
      error: "tooManyAttempts",
      params: { minutes: 20 },
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});
