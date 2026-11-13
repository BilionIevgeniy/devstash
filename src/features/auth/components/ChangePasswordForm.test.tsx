import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import type { AuthActionState } from "@/features/auth/types";

import { CatchBoundary } from "../../../../test/catch-boundary";

const { changePassword, signOutAfterPasswordChange, toastSuccess, rethrow } =
  vi.hoisted(() => ({
    changePassword: vi.fn(),
    signOutAfterPasswordChange: vi.fn(),
    toastSuccess: vi.fn(),
    rethrow: vi.fn(),
  }));
vi.mock("@/features/auth/_internal/actions/account", () => ({
  changePassword,
  signOutAfterPasswordChange,
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: rethrow }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";

const SUCCESS: AuthActionState = { success: true, data: null, error: null };
const WRONG_PASSWORD: AuthActionState = {
  success: false,
  data: null,
  error: "Current password is incorrect",
};

afterEach(() => {
  vi.restoreAllMocks();
});

interface Typed {
  current?: string;
  next?: string;
  confirm?: string;
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { current = "old-password-1", next = "new-password-1", confirm }: Typed = {},
) {
  await user.type(screen.getByLabelText("Current password"), current);
  await user.type(screen.getByLabelText("New password"), next);
  await user.type(
    screen.getByLabelText("Confirm new password"),
    confirm ?? next,
  );
  await user.click(screen.getByRole("button", { name: "Update password" }));
}

describe("ChangePasswordForm", () => {
  it("shows the error from the action and keeps every typed field", async () => {
    changePassword.mockResolvedValue(WRONG_PASSWORD);
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Current password is incorrect",
    );
    expect(screen.getByLabelText("Current password")).toHaveValue(
      "old-password-1",
    );
    expect(screen.getByLabelText("New password")).toHaveValue("new-password-1");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue(
      "new-password-1",
    );
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeEnabled();
    expect(signOutAfterPasswordChange).not.toHaveBeenCalled();
  });

  it("asks for three password fields the browser can manage", () => {
    render(<ChangePasswordForm />);

    const current = screen.getByLabelText("Current password");
    const next = screen.getByLabelText("New password");
    const confirm = screen.getByLabelText("Confirm new password");

    for (const input of [current, next, confirm]) {
      expect(input).toHaveAttribute("type", "password");
      expect(input).toBeRequired();
    }
    expect(current).toHaveAttribute("autocomplete", "current-password");
    for (const input of [next, confirm]) {
      expect(input).toHaveAttribute("autocomplete", "new-password");
      expect(input).toHaveAttribute("minlength", String(MIN_PASSWORD_LENGTH));
      expect(input).toHaveAttribute("maxlength", String(MAX_PASSWORD_LENGTH));
    }
  });

  it("sends the three passwords to the action", async () => {
    changePassword.mockResolvedValue(WRONG_PASSWORD);
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAndSubmit(user);
    await screen.findByRole("alert");

    expect(changePassword).toHaveBeenCalledExactlyOnceWith({
      currentPassword: "old-password-1",
      newPassword: "new-password-1",
      confirmPassword: "new-password-1",
    });
  });

  it("catches a mismatch before the action and keeps the fields", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAndSubmit(user, { confirm: "another-password" });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match",
    );
    expect(changePassword).not.toHaveBeenCalled();
    expect(signOutAfterPasswordChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Confirm new password")).toHaveValue(
      "another-password",
    );
  });

  it("disables the button and says so while the change runs", async () => {
    const pending = Promise.withResolvers<AuthActionState>();
    changePassword.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAndSubmit(user);

    expect(
      await screen.findByRole("button", { name: "Updating password…" }),
    ).toBeDisabled();
    pending.resolve(WRONG_PASSWORD);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeEnabled();
  });

  it("takes the old error away while a new attempt runs, so the next one is announced", async () => {
    changePassword.mockResolvedValueOnce(WRONG_PASSWORD);
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    await fillAndSubmit(user);
    await screen.findByRole("alert");

    const pending = Promise.withResolvers<AuthActionState>();
    changePassword.mockReturnValue(pending.promise);
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await screen.findByRole("button", { name: "Updating password…" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    pending.resolve(WRONG_PASSWORD);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("toasts and signs the user out once the password changed", async () => {
    changePassword.mockResolvedValue(SUCCESS);
    signOutAfterPasswordChange.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAndSubmit(user);

    await waitFor(() => expect(signOutAfterPasswordChange).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledExactlyOnceWith(
      "Password updated. Please sign in again.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("empties the fields once the password is changed", async () => {
    changePassword.mockResolvedValue(SUCCESS);
    signOutAfterPasswordChange.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByLabelText("New password")).toHaveValue(""),
    );
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
  });

  it("says to reload when the sign-out fails after the password changed, and empties the fields", async () => {
    changePassword.mockResolvedValue(SUCCESS);
    signOutAfterPasswordChange.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Password updated. Reload the page to sign in again.",
    );
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(toastSuccess).toHaveBeenCalledOnce();
  });

  it("lets the sign-out's redirect leave the form instead of showing an alert", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    changePassword.mockResolvedValue(SUCCESS);
    signOutAfterPasswordChange.mockRejectedValue(redirect);
    rethrow.mockImplementation((error: unknown) => {
      throw error;
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <CatchBoundary>
        <ChangePasswordForm />
      </CatchBoundary>,
    );

    await fillAndSubmit(user);

    expect(
      await screen.findByText("Caught: NEXT_REDIRECT"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a generic error when the action rejects, after Next had a look at it", async () => {
    const failure = new Error("network");
    changePassword.mockRejectedValue(failure);
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(rethrow).toHaveBeenCalledWith(failure);
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
