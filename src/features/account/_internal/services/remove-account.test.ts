import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteVerifiedUserRows: vi.fn(),
  deleteBillingCustomer: vi.fn(),
  purgeUserObjects: vi.fn(),
  error: vi.fn(async () => {}),
}));
vi.mock("@/features/auth/services/account", () => ({
  deleteVerifiedUserRows: mocks.deleteVerifiedUserRows,
}));
vi.mock("@/features/billing/services/customer", () => ({
  deleteBillingCustomer: mocks.deleteBillingCustomer,
}));
vi.mock("@/features/files/services/objects", () => ({
  purgeUserObjects: mocks.purgeUserObjects,
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error: mocks.error, warn: vi.fn(), info: vi.fn() },
}));

import { removeVerifiedAccount } from "@/features/account/_internal/services/remove-account";
import type { VerifiedDeletion } from "@/features/auth/services/account";
import { fail, ok } from "@/lib/errors/action-result";

const VERIFIED = {
  userId: "user-1",
  email: "ada@example.com",
} as unknown as VerifiedDeletion;

// The order of the steps is checked through the user's own delete
// (delete-account.test.ts); here is what both callers share.
describe("removeVerifiedAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.deleteVerifiedUserRows.mockResolvedValue(true);
  });

  it("purges again after the rows, for an upload that landed in between", async () => {
    const steps: string[] = [];
    mocks.deleteBillingCustomer.mockImplementation(() => steps.push("billing"));
    mocks.purgeUserObjects.mockImplementation(() => steps.push("files"));
    mocks.deleteVerifiedUserRows.mockImplementation(() => steps.push("rows"));

    expect(await removeVerifiedAccount(VERIFIED)).toMatchObject({
      success: true,
    });
    expect(steps).toEqual(["billing", "files", "rows", "files"]);
  });

  // Nobody pays for a deleted account.
  it("stops before the files when the billing cannot be ended", async () => {
    mocks.deleteBillingCustomer.mockRejectedValue(new Error("Stripe down"));

    expect(await removeVerifiedAccount(VERIFIED)).toEqual(
      fail("subscriptionCancelFailed"),
    );
    expect(mocks.purgeUserObjects).not.toHaveBeenCalled();
    expect(mocks.deleteVerifiedUserRows).not.toHaveBeenCalled();
  });

  // No file may outlive the rows that would let the user delete it.
  it("stops before the rows when the purge fails", async () => {
    mocks.purgeUserObjects.mockRejectedValue(new Error("R2 down"));

    expect(await removeVerifiedAccount(VERIFIED)).toEqual(
      fail("filesPurgeFailed"),
    );
    expect(mocks.deleteVerifiedUserRows).not.toHaveBeenCalled();
  });

  it("says the row stayed when the registration was verified meanwhile", async () => {
    mocks.deleteVerifiedUserRows.mockResolvedValue(false);

    expect(await removeVerifiedAccount(VERIFIED)).toEqual(
      ok({ removed: false }),
    );
    expect(mocks.purgeUserObjects).toHaveBeenCalledOnce();
  });

  it("counts as removed when only the second purge fails, and logs it", async () => {
    mocks.purgeUserObjects
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("R2 down"));

    expect(await removeVerifiedAccount(VERIFIED)).toEqual(
      ok({ removed: true }),
    );
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("lets a failure of the rows through: it is no expected outcome", async () => {
    mocks.deleteVerifiedUserRows.mockRejectedValue(new Error("database down"));

    await expect(removeVerifiedAccount(VERIFIED)).rejects.toThrow(
      "database down",
    );
  });
});
