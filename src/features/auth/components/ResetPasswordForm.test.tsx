import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import type { AuthActionState } from "@/features/auth/types";
import type { ErrorCode } from "@/i18n/error-codes";

const { resetPassword, replace, toastSuccess } = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  replace: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock("@/features/auth/_internal/actions/password-reset", () => ({
  resetPassword,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

const SUCCESS: AuthActionState = { success: true, data: null, error: null };

function failure(error: ErrorCode): AuthActionState {
  return { success: false, data: null, error };
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  confirm = "new-password-1",
) {
  await user.type(screen.getByLabelText("New password"), "new-password-1");
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  await user.click(screen.getByRole("button", { name: "Update password" }));
}

function renderForm() {
  return render(<ResetPasswordForm email="ada@example.com" token="tok-123" />);
}

describe("ResetPasswordForm", () => {
  it("shows the error from the action and keeps both fields", async () => {
    resetPassword.mockResolvedValue(failure("emailSendFailed"));
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't send the email. Please try again later.",
    );
    expect(screen.getByLabelText("New password")).toHaveValue("new-password-1");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue(
      "new-password-1",
    );
  });

  it("sends the link's email and token with the passwords", async () => {
    resetPassword.mockResolvedValue(failure("generic"));
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);
    await screen.findByRole("alert");

    expect(resetPassword).toHaveBeenCalledExactlyOnceWith({
      email: "ada@example.com",
      token: "tok-123",
      password: "new-password-1",
      confirmPassword: "new-password-1",
    });
  });

  it("catches a mismatch before the action", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user, "another-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match",
    );
    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Confirm new password")).toHaveValue(
      "another-password",
    );
  });

  it("toasts and replaces the page with the sign-in page on success", async () => {
    resetPassword.mockResolvedValue(SUCCESS);
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
    expect(toastSuccess).toHaveBeenCalledExactlyOnceWith(
      "Password updated. You can now sign in.",
    );
  });

  it("empties both fields once the password is reset", async () => {
    resetPassword.mockResolvedValue(SUCCESS);
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByLabelText("New password")).toHaveValue(""),
    );
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
  });

  it("asks for two new-password fields the browser can manage", () => {
    renderForm();

    for (const label of ["New password", "Confirm new password"]) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("type", "password");
      expect(input).toHaveAttribute("autocomplete", "new-password");
      expect(input).toBeRequired();
      expect(input).toHaveAttribute("minlength", String(MIN_PASSWORD_LENGTH));
      expect(input).toHaveAttribute("maxlength", String(MAX_PASSWORD_LENGTH));
    }
  });

  it("offers a new link when the old one is no longer valid", async () => {
    resetPassword.mockResolvedValue(failure("invalidResetLink"));
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(
      await screen.findByRole("link", { name: "Request a new reset link" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("shows a generic error when the action rejects", async () => {
    resetPassword.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("disables the button and says so while the reset runs", async () => {
    const pending = Promise.withResolvers<AuthActionState>();
    resetPassword.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(
      await screen.findByRole("button", { name: "Updating password…" }),
    ).toBeDisabled();
    pending.resolve(failure("generic"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
