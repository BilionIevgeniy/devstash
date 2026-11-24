import { act, renderHook } from "../../../../../test/intl";
import { describe, expect, it, vi } from "vitest";

import { ok } from "@/lib/errors/action-result";

const { signOutUser, leaveSession, toastError } = vi.hoisted(() => ({
  signOutUser: vi.fn(),
  leaveSession: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/features/auth/actions/sign-in", () => ({ signOutUser }));
vi.mock("@/features/auth/components/leave-session", () => ({ leaveSession }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { useSignOut } from "@/features/auth/components/hooks/use-sign-out";

function redirectError(): Error {
  return Object.assign(new Error("NEXT_REDIRECT"), {
    digest: "NEXT_REDIRECT;replace;/sign-in;307;",
  });
}

describe("useSignOut", () => {
  it("loads the homepage of the user's language as a new document", async () => {
    signOutUser.mockResolvedValue(ok());
    const { result } = renderHook(() => useSignOut(), { locale: "de" });

    await act(async () => result.current());

    expect(leaveSession).toHaveBeenCalledExactlyOnceWith("/de");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("leaves the same way when the page's re-render redirects", async () => {
    signOutUser.mockRejectedValue(redirectError());
    const { result } = renderHook(() => useSignOut());

    await act(async () => result.current());

    expect(leaveSession).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("leaves after a failure too, which it names", async () => {
    signOutUser.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useSignOut());

    await act(async () => result.current());

    expect(toastError).toHaveBeenCalledExactlyOnceWith(
      "Something went wrong. Please try again.",
    );
    expect(leaveSession).toHaveBeenCalledExactlyOnceWith("/");
  });
});
