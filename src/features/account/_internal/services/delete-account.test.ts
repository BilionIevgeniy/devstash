import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyAccountDeletion, deleteVerifiedUserRows, purgeUserObjects } =
  vi.hoisted(() => ({
    verifyAccountDeletion: vi.fn(),
    deleteVerifiedUserRows: vi.fn(),
    purgeUserObjects: vi.fn(),
  }));
vi.mock("@/features/auth/services/account", () => ({
  verifyAccountDeletion,
  deleteVerifiedUserRows,
}));
vi.mock("@/features/files/services/objects", () => ({ purgeUserObjects }));

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
    expect(result.error).toMatch(/nothing was removed/);
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
