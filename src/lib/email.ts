import "server-only";

import { Resend } from "resend";
import { fail, ok, type OperationResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: Email): Promise<OperationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    await logger.error("RESEND_API_KEY or EMAIL_FROM is not set");
    return fail("Email is not configured");
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      await logger.error("Resend rejected an email", { error });
      return fail(error.message);
    }
    return ok();
  } catch (error) {
    await logger.error("Sending an email failed", { error });
    return fail("Failed to send email");
  }
}
