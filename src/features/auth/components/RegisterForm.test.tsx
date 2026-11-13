import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RegisterResult } from "@/features/auth/_internal/components/fetch-register";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";

const { postRegistration } = vi.hoisted(() => ({ postRegistration: vi.fn() }));
vi.mock("@/features/auth/_internal/components/fetch-register", () => ({
  postRegistration,
}));
vi.mock("@/features/auth/_internal/actions/email-verification", () => ({
  resendVerificationEmail: vi.fn(),
}));

import { RegisterForm } from "@/features/auth/components/RegisterForm";

const ACCEPTED: RegisterResult = { success: true };
const TOO_MANY: RegisterResult = {
  success: false,
  data: null,
  error: "tooManyAttempts",
  params: { minutes: 5 },
};

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  confirm = "my-password-1",
) {
  await user.type(screen.getByLabelText("Name"), "Ada");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "my-password-1");
  await user.type(screen.getByLabelText("Confirm password"), confirm);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("RegisterForm", () => {
  it("shows the error from the route and keeps every typed field", async () => {
    postRegistration.mockResolvedValue(TOO_MANY);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts. Please try again in 5 minutes.",
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("my-password-1");
    expect(screen.getByLabelText("Confirm password")).toHaveValue(
      "my-password-1",
    );
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  it("asks for the fields the browser can manage", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "autocomplete",
      "name",
    );
    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    for (const label of ["Password", "Confirm password"]) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("type", "password");
      expect(input).toHaveAttribute("autocomplete", "new-password");
      expect(input).toHaveAttribute("minlength", String(MIN_PASSWORD_LENGTH));
      expect(input).toHaveAttribute("maxlength", String(MAX_PASSWORD_LENGTH));
    }
    for (const field of screen.getAllByRole("textbox")) {
      expect(field).toBeRequired();
    }
  });

  it("sends the four fields to the route helper", async () => {
    postRegistration.mockResolvedValue(TOO_MANY);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user);
    await screen.findByRole("alert");

    expect(postRegistration).toHaveBeenCalledExactlyOnceWith({
      name: "Ada",
      email: "ada@example.com",
      password: "my-password-1",
      confirmPassword: "my-password-1",
    });
  });

  it("catches a mismatch before the request", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user, "another-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match",
    );
    expect(postRegistration).not.toHaveBeenCalled();
  });

  it("gives way to the check-your-email notice once the account is accepted", async () => {
    postRegistration.mockResolvedValue(ACCEPTED);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user);

    expect(
      await screen.findByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create account" }),
    ).not.toBeInTheDocument();
  });

  it("disables the button and says so while the account is created", async () => {
    const pending = Promise.withResolvers<RegisterResult>();
    postRegistration.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user);

    expect(
      await screen.findByRole("button", { name: "Creating account…" }),
    ).toBeDisabled();
    pending.resolve(TOO_MANY);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
