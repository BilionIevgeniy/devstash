import { render, screen } from "../../../../test/intl";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AuthActionState } from "@/features/auth/types";

const signInWithCredentials = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/actions/sign-in", () => ({ signInWithCredentials }));
vi.mock("@/features/auth/_internal/actions/email-verification", () => ({
  resendVerificationEmail: vi.fn(),
}));

import { SignInForm } from "@/features/auth/components/SignInForm";

const REJECTED: AuthActionState = {
  success: false,
  data: null,
  error: "invalidCredentials",
};

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "wrong-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  it("shows the error from the action and keeps the typed email", async () => {
    signInWithCredentials.mockResolvedValue(REJECTED);
    const user = userEvent.setup();
    render(<SignInForm callbackUrl="/dashboard" />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("sends the email, the password and the callback URL to the action", async () => {
    signInWithCredentials.mockResolvedValue(REJECTED);
    const user = userEvent.setup();
    render(<SignInForm callbackUrl="/collections" />);

    await fillAndSubmit(user);

    const formData: FormData = signInWithCredentials.mock.calls[0][1];
    expect(formData.get("email")).toBe("ada@example.com");
    expect(formData.get("password")).toBe("wrong-password");
    expect(formData.get("callbackUrl")).toBe("/collections");
  });

  it("disables the button and says so while the sign-in runs", async () => {
    const pending = Promise.withResolvers<AuthActionState>();
    signInWithCredentials.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<SignInForm callbackUrl="/dashboard" />);

    await fillAndSubmit(user);

    expect(
      await screen.findByRole("button", { name: "Signing in…" }),
    ).toBeDisabled();
    pending.resolve(REJECTED);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("shows the error it was given before anything is submitted", () => {
    render(
      <SignInForm
        callbackUrl="/dashboard"
        initialError="oauthAccountNotLinked"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This email is already registered with a different sign-in method",
    );
  });
});
