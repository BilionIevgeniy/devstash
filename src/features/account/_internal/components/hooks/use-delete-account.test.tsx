import { act, renderHook } from "../../../../../../test/intl";
import { describe, expect, it, vi } from "vitest";

import { fail, ok } from "@/lib/errors/action-result";

const { deleteAccount, leaveSession } = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  leaveSession: vi.fn(),
}));
vi.mock("@/features/account/_internal/actions/delete-account", () => ({
  deleteAccount,
  requestAccountDeletionLink: vi.fn(),
}));
vi.mock("@/features/auth/components/leave-session", () => ({ leaveSession }));

import { useDeleteAccount } from "@/features/account/_internal/components/hooks/use-delete-account";

// What Next.js rejects a Server Action's redirect with.
function redirectError(): Error {
  return Object.assign(new Error("NEXT_REDIRECT"), {
    digest: "NEXT_REDIRECT;replace;/sign-in;307;",
  });
}

describe("useDeleteAccount", () => {
  it("keeps a refusal as the error and stays on the page", async () => {
    deleteAccount.mockResolvedValue(fail("incorrectPassword"));
    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => result.current.submit({ password: "pw" }));

    expect(deleteAccount).toHaveBeenCalledWith({ password: "pw" });
    expect(result.current.error).toMatchObject({ error: "incorrectPassword" });
    expect(result.current.isPending).toBe(false);
    expect(leaveSession).not.toHaveBeenCalled();
  });

  it("turns an unexpected throw into the generic error", async () => {
    deleteAccount.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => result.current.submit({ token: "tok" }));

    expect(result.current.error).toEqual({ error: "generic" });
    expect(leaveSession).not.toHaveBeenCalled();
  });

  it("loads the homepage of the user's language after a delete, and stays pending until then", async () => {
    deleteAccount.mockResolvedValue(ok());
    const { result } = renderHook(() => useDeleteAccount(), { locale: "de" });

    await act(async () => result.current.submit({ password: "pw" }));

    expect(leaveSession).toHaveBeenCalledExactlyOnceWith("/de");
    expect(result.current.isPending).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("leaves the same way when the page's re-render redirects, never softly", async () => {
    deleteAccount.mockRejectedValue(redirectError());
    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => result.current.submit({ password: "pw" }));

    expect(leaveSession).toHaveBeenCalledExactlyOnceWith("/");
    expect(result.current.error).toBeNull();
  });
});
