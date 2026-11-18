import { act, renderHook } from "../../../../../../test/intl";
import { describe, expect, it, vi } from "vitest";

import { fail } from "@/lib/errors/action-result";

const { deleteAccount } = vi.hoisted(() => ({ deleteAccount: vi.fn() }));
vi.mock("@/features/account/_internal/actions/delete-account", () => ({
  deleteAccount,
  requestAccountDeletionLink: vi.fn(),
}));

import { useDeleteAccount } from "@/features/account/_internal/components/hooks/use-delete-account";

describe("useDeleteAccount", () => {
  it("keeps a refusal as the error", async () => {
    deleteAccount.mockResolvedValue(fail("incorrectPassword"));
    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => result.current.submit({ password: "pw" }));

    expect(deleteAccount).toHaveBeenCalledWith({ password: "pw" });
    expect(result.current.error).toMatchObject({ error: "incorrectPassword" });
    expect(result.current.isPending).toBe(false);
  });

  it("turns an unexpected throw into the generic error", async () => {
    deleteAccount.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => result.current.submit({ token: "tok" }));

    expect(result.current.error).toEqual({ error: "generic" });
  });
});
