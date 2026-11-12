import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  INVALID_LINK_ERROR,
  WRONG_CONFIRM_PASSWORD_MESSAGE,
} from "@/features/auth/domain/verification-token";
import type { AuthActionState } from "@/features/auth/types";

const { confirmEmail, replace, toastSuccess } = vi.hoisted(() => ({
  confirmEmail: vi.fn(),
  replace: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock("@/features/auth/_internal/actions/email-verification", () => ({
  confirmEmail,
  resendVerificationEmail: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

import { ConfirmEmailForm } from "@/features/auth/components/ConfirmEmailForm";

const SUCCESS: AuthActionState = { success: true, data: null, error: null };

function failure(error: string): AuthActionState {
  return { success: false, data: null, error };
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Password"), "my-password-1");
  await user.click(screen.getByRole("button", { name: "Verify email" }));
}

function renderForm() {
  return render(<ConfirmEmailForm email="ada@example.com" token="tok-123" />);
}

describe("ConfirmEmailForm", () => {
  it("shows the error from the action and keeps the typed password", async () => {
    confirmEmail.mockResolvedValue(failure("Something is off"));
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something is off",
    );
    expect(screen.getByLabelText("Password")).toHaveValue("my-password-1");
  });

  it("sends the link's email and token with the password", async () => {
    confirmEmail.mockResolvedValue(failure("nope"));
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);
    await screen.findByRole("alert");

    expect(confirmEmail).toHaveBeenCalledExactlyOnceWith({
      email: "ada@example.com",
      token: "tok-123",
      password: "my-password-1",
    });
  });

  it("toasts and replaces the page with the sign-in page on success", async () => {
    confirmEmail.mockResolvedValue(SUCCESS);
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
    expect(toastSuccess).toHaveBeenCalledExactlyOnceWith(
      "Email verified. You can now sign in.",
    );
  });

  it("empties the password once the email is confirmed", async () => {
    confirmEmail.mockResolvedValue(SUCCESS);
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByLabelText("Password")).toHaveValue(""),
    );
  });

  it("asks for the current password in a field the browser can manage", () => {
    renderForm();

    const input = screen.getByLabelText("Password");

    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(input).toBeRequired();
  });

  it("points a wrong password to the password reset", async () => {
    confirmEmail.mockResolvedValue(failure(WRONG_CONFIRM_PASSWORD_MESSAGE));
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(
      await screen.findByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("offers to resend the email when the link is no longer valid", async () => {
    confirmEmail.mockResolvedValue(failure(INVALID_LINK_ERROR));
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(
      await screen.findByRole("button", { name: /resend/i }),
    ).toBeInTheDocument();
  });

  it("shows a generic error when the action rejects", async () => {
    confirmEmail.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("disables the button and says so while the check runs", async () => {
    const pending = Promise.withResolvers<AuthActionState>();
    confirmEmail.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(
      await screen.findByRole("button", { name: "Verifying…" }),
    ).toBeDisabled();
    pending.resolve(failure("nope"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
