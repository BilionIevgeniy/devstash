import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/features/auth/queries", () => ({
  getUserProfile: mocks.getUserProfile,
}));
vi.mock("@/lib/vendors/email", () => ({ sendEmail: mocks.sendEmail }));
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
    await expect(sendContractConfirmation(CLAIMED)).resolves.toBe(true);

    const email = mocks.sendEmail.mock.calls[0][0];
    expect(email.to).toBe("dev@example.com");
    expect(email.idempotencyKey).toBe("contract-confirmation/sub_1");
    expect(email.subject).toBe("Dein Vertrag über DevStash Pro");
    expect(email.text).toMatch(/Preis: 72\s€ pro Jahr/);
  });

  it("states the order as it was: monthly, in English", async () => {
    await sendContractConfirmation({
      ...CLAIMED,
      metadata: { locale: "xx", plan: "monthly" },
    });

    const email = mocks.sendEmail.mock.calls[0][0];
    expect(email.subject).not.toContain("Vertrag");
    expect(email.text).toContain("Price: €8 per month");
  });

  it("answers false when the email fails, so the row stays unmarked", async () => {
    mocks.sendEmail.mockResolvedValue({
      success: false,
      data: null,
      error: "emailSendFailed",
    });

    await expect(sendContractConfirmation(CLAIMED)).resolves.toBe(false);
  });

  it("answers false when the text cannot be built", async () => {
    await expect(
      sendContractConfirmation({
        ...CLAIMED,
        consent: { ...CLAIMED.consent, termsVersion: "never-published" },
      }),
    ).resolves.toBe(false);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("counts a deleted account as done: nobody to confirm to", async () => {
    mocks.getUserProfile.mockResolvedValue(null);

    await expect(sendContractConfirmation(CLAIMED)).resolves.toBe(true);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
