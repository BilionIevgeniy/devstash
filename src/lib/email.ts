import "server-only";

import { Resend } from "resend";

export interface EmailResult {
  success: boolean;
  error: string | null;
}

interface ActionEmailCopy {
  subject: string;
  heading: string;
  intro: string;
  buttonLabel: string;
  ignoreNote: string;
}

const VERIFICATION_COPY: ActionEmailCopy = {
  subject: "Verify your DevStash email",
  heading: "Verify your email",
  intro:
    "Thanks for signing up for DevStash. Confirm your email address to finish creating your account",
  buttonLabel: "Verify email",
  ignoreNote: "If you didn't create an account, you can ignore this email.",
};

const PASSWORD_RESET_COPY: ActionEmailCopy = {
  subject: "Reset your DevStash password",
  heading: "Reset your password",
  intro:
    "We received a request to reset the password for your DevStash account. Use the link below to choose a new one",
  buttonLabel: "Reset password",
  ignoreNote: "If you didn't request this, you can ignore this email.",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatExpiry(expiresInHours: number): string {
  const unit = expiresInHours === 1 ? "hour" : "hours";
  return `This link expires in ${expiresInHours} ${unit}.`;
}

function buildActionHtml(
  copy: ActionEmailCopy,
  actionUrl: string,
  expiresInHours: number,
) {
  const url = escapeHtml(actionUrl);
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:20px;margin:0 0 16px">${copy.heading}</h1>
  <p style="margin:0 0 24px;line-height:1.5">${copy.intro}.</p>
  <p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px">${copy.buttonLabel}</a></p>
  <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.5">${formatExpiry(expiresInHours)} ${copy.ignoreNote}</p>
  <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all">${url}</p>
</div>`;
}

function buildActionText(
  copy: ActionEmailCopy,
  actionUrl: string,
  expiresInHours: number,
) {
  return `${copy.intro}:

${actionUrl}

${formatExpiry(expiresInHours)} ${copy.ignoreNote}`;
}

async function sendActionEmail(
  copy: ActionEmailCopy,
  to: string,
  actionUrl: string,
  expiresInHours: number,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("RESEND_API_KEY or EMAIL_FROM is not set");
    return { success: false, error: "Email is not configured" };
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject: copy.subject,
      html: buildActionHtml(copy, actionUrl, expiresInHours),
      text: buildActionText(copy, actionUrl, expiresInHours),
    });
    if (error) {
      console.error(`Resend rejected the email "${copy.subject}":`, error);
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (error) {
    console.error(`Failed to send the email "${copy.subject}":`, error);
    return { success: false, error: "Failed to send email" };
  }
}

export function sendVerificationEmail(
  to: string,
  verifyUrl: string,
  expiresInHours: number,
): Promise<EmailResult> {
  return sendActionEmail(VERIFICATION_COPY, to, verifyUrl, expiresInHours);
}

export function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  expiresInHours: number,
): Promise<EmailResult> {
  return sendActionEmail(PASSWORD_RESET_COPY, to, resetUrl, expiresInHours);
}
