import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyAccountDeletion,
  deleteVerifiedUserRows,
  purgeUserObjects,
  deleteBillingCustomer,
} = vi.hoisted(() => ({
  verifyAccountDeletion: vi.fn(),
  deleteVerifiedUserRows: vi.fn(),
  purgeUserObjects: vi.fn(),
  deleteBillingCustomer: vi.fn(),
}));
vi.mock("@/features/auth/services/account", () => ({
  verifyAccountDeletion,
  deleteVerifiedUserRows,
}));
vi.mock("@/features/files/services/objects", () => ({ purgeUserObjects }));
vi.mock("@/features/billing/services/customer", () => ({
  deleteBillingCustomer,
}));

import { deleteAccount } from "@/features/account/_internal/services/delete-account";

const verified = { userId: "user-1", email: "ada@example.com" };

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    verifyAccountDeletion.mockResolvedValue({
      success: true,
      error: null,
      data: verified,
    });
    purgeUserObjects.mockResolvedValue(undefined);
    deleteVerifiedUserRows.mockResolvedValue(undefined);
    deleteBillingCustomer.mockResolvedValue(undefined);
  });

  it("stops the billing before it touches the files", async () => {
    await deleteAccount("user-1", { password: "pw" });

    expect(deleteBillingCustomer).toHaveBeenCalledWith("user-1");
    expect(deleteBillingCustomer.mock.invocationCallOrder[0]).toBeLessThan(
      purgeUserObjects.mock.invocationCallOrder[0],
    );
  });

  it("removes nothing when the cancel fails", async () => {
    deleteBillingCustomer.mockRejectedValue(new Error("Stripe is down"));

    const result = await deleteAccount("user-1", { password: "pw" });

    expect(result).toEqual({
      success: false,
      error:
        "Your subscription could not be cancelled, so nothing was removed. Please try again.",
    });
    expect(purgeUserObjects).not.toHaveBeenCalled();
    expect(deleteVerifiedUserRows).not.toHaveBeenCalled();
  });

  it("purges the files before it deletes the rows", async () => {
    const result = await deleteAccount("user-1", { password: "pw" });

    expect(result).toEqual({ success: true, error: null });
    expect(purgeUserObjects).toHaveBeenCalledWith("user-1");
    expect(purgeUserObjects.mock.invocationCallOrder[0]).toBeLessThan(
      deleteVerifiedUserRows.mock.invocationCallOrder[0],
    );
    expect(deleteVerifiedUserRows).toHaveBeenCalledWith(verified);
  });

  it("keeps the rows when the purge fails", async () => {
    purgeUserObjects.mockRejectedValue(new Error("R2 down"));

    const result = await deleteAccount("user-1", { password: "pw" });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Your files could not be deleted, so your account was not removed. Any active subscription has been cancelled. Please try again.",
    );
    expect(deleteVerifiedUserRows).not.toHaveBeenCalled();
  });

  it("touches neither R2 nor the rows when the proof fails", async () => {
    verifyAccountDeletion.mockResolvedValue({
      success: false,
      error: "Password is incorrect",
      data: null,
    });

    const result = await deleteAccount("user-1", { password: "nope" });

    expect(result).toMatchObject({
      success: false,
      error: "Password is incorrect",
    });
    expect(deleteBillingCustomer).not.toHaveBeenCalled();
    expect(purgeUserObjects).not.toHaveBeenCalled();
    expect(deleteVerifiedUserRows).not.toHaveBeenCalled();
  });

  it("does nothing for a user who is already gone", async () => {
    verifyAccountDeletion.mockResolvedValue({
      success: true,
      error: null,
      data: null,
    });

    const result = await deleteAccount("user-1", {});

    expect(result.success).toBe(true);
    expect(purgeUserObjects).not.toHaveBeenCalled();
    expect(deleteVerifiedUserRows).not.toHaveBeenCalled();
  });

  it("still succeeds when the second purge fails after the rows are gone", async () => {
    purgeUserObjects
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("R2 down"));

    const result = await deleteAccount("user-1", { password: "pw" });

    expect(result.success).toBe(true);
    expect(purgeUserObjects).toHaveBeenCalledTimes(2);
  });
});
