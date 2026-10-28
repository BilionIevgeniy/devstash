import {
  type ActionEmailCopy,
  buildActionEmail,
  type BuiltEmail,
} from "@/features/auth/_internal/emails/action-email";

const COPY: ActionEmailCopy = {
  subject: "Verify your DevStash email",
  heading: "Verify your email",
  intro:
    "Thanks for signing up for DevStash. Confirm your email address to finish creating your account",
  buttonLabel: "Verify email",
  ignoreNote: "If you didn't create an account, you can ignore this email.",
};

export function buildVerificationEmail(
  verifyUrl: string,
  expiresInHours: number,
): BuiltEmail {
  return buildActionEmail(COPY, verifyUrl, expiresInHours);
}
