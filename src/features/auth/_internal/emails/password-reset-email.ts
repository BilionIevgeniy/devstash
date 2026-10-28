import {
  type ActionEmailCopy,
  buildActionEmail,
  type BuiltEmail,
} from "@/features/auth/_internal/emails/action-email";

const COPY: ActionEmailCopy = {
  subject: "Reset your DevStash password",
  heading: "Reset your password",
  intro:
    "We received a request to reset the password for your DevStash account. Use the link below to choose a new one",
  buttonLabel: "Reset password",
  ignoreNote: "If you didn't request this, you can ignore this email.",
};

export function buildPasswordResetEmail(
  resetUrl: string,
  expiresInHours: number,
): BuiltEmail {
  return buildActionEmail(COPY, resetUrl, expiresInHours);
}
