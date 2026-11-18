import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
  sendEmail: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/features/auth/queries", () => ({
  getUserProfile: mocks.getUserProfile,
}));
vi.mock("@/lib/vendors/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: { subscription: { updateMany: mocks.updateMany } },
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { sendContractConfirmation } from "@/features/billing/_internal/services/contract-confirmation";

const CLAIMED = {
  userId: "user-1",
  subscriptionId: "sub_1",
  startedAt: new Date("2026-11-18T09:01:00Z"),
  consent: {
    withdrawalWaiverAt: new Date("2026-11-18T09:00:00Z"),
    termsVersion: "2026-11-18",
  },
  metadata: { locale: "de", plan: "yearly" },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserProfile.mockResolvedValue({ email: "dev@example.com" });
  mocks.sendEmail.mockResolvedValue({ success: true, data: null, error: null });
});

describe("sendContractConfirmation", () => {
  it("sends once per subscription, in the language of the order", async () => {
    await sendContractConfirmation(CLAIMED);

    const email = mocks.sendEmail.mock.calls[0][0];
    expect(email.to).toBe("dev@example.com");
    expect(email.idempotencyKey).toBe("contract-confirmation/sub_1");
    expect(email.subject).toBe("Dein Vertrag über DevStash Pro");
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("gives the claim back when the email fails, so it is sent again", async () => {
    mocks.sendEmail.mockResolvedValue({
      success: false,
      data: null,
      error: "emailSendFailed",
    });

    await sendContractConfirmation(CLAIMED);

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", confirmedSubscriptionId: "sub_1" },
      data: { confirmedSubscriptionId: null },
    });
  });

  it("gives the claim back when the text cannot be built", async () => {
    await sendContractConfirmation({
      ...CLAIMED,
      consent: { ...CLAIMED.consent, termsVersion: "never-published" },
    });

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenCalled();
  });

  it("keeps the claim when the account is gone", async () => {
    mocks.getUserProfile.mockResolvedValue(null);

    await sendContractConfirmation(CLAIMED);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
