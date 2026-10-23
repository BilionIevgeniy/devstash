import "server-only";

import { Resend } from "resend";

export interface EmailResult {
  success: boolean;
  error: string | null;
}

const VERIFICATION_SUBJECT = "Verify your DevStash email";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildVerificationHtml(verifyUrl: string, expiresInHours: number) {
  const url = escapeHtml(verifyUrl);
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:20px;margin:0 0 16px">Verify your email</h1>
  <p style="margin:0 0 24px;line-height:1.5">Thanks for signing up for DevStash. Confirm your email address to finish creating your account.</p>
  <p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px">Verify email</a></p>
  <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.5">This link expires in ${expiresInHours} hours. If you didn't create an account, you can ignore this email.</p>
  <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all">${url}</p>
</div>`;
}

function buildVerificationText(verifyUrl: string, expiresInHours: number) {
  return `Thanks for signing up for DevStash. Confirm your email address to finish creating your account:

${verifyUrl}

This link expires in ${expiresInHours} hours. If you didn't create an account, you can ignore this email.`;
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
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
      subject: VERIFICATION_SUBJECT,
      html: buildVerificationHtml(verifyUrl, expiresInHours),
      text: buildVerificationText(verifyUrl, expiresInHours),
    });
    if (error) {
      console.error("Resend rejected the verification email:", error);
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, error: "Failed to send email" };
  }
}
