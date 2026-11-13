"use server";

import { headers } from "next/headers";
import { confirmEmailSchema, emailSchema } from "@/features/auth/schemas";
import {
  confirmEmailAddress,
  resendVerificationLink,
} from "@/features/auth/services/email-verification";
import type { AuthActionState } from "@/features/auth/types";
import { getAppOrigin } from "@/lib/app-url";
import { getClientIp } from "@/lib/client-ip";
import { logger } from "@/lib/logger";
import { fail, GENERIC_ERROR_MESSAGE, ok } from "@/lib/action-result";
import { firstIssueMessage } from "@/lib/validation";

const SUCCESS: AuthActionState = ok();

interface ConfirmEmailInput {
  email: string;
  token: string;
  password: string;
}

export async function resendVerificationEmail(
  email: string,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail(firstIssueMessage(parsed.error));

  try {
    // Read before any lookup so a missing APP_URL fails the same way for every
    // address and does not reveal which ones have an account.
    const origin = getAppOrigin();

    const result = await resendVerificationLink(
      parsed.data,
      origin,
      getClientIp(await headers()),
    );
    return result.success ? SUCCESS : fail(result.error);
  } catch (error) {
    await logger.error("Resending the verification email failed", { error });
    return fail(GENERIC_ERROR_MESSAGE);
  }
}

export async function confirmEmail(
  input: ConfirmEmailInput,
): Promise<AuthActionState> {
  const parsed = confirmEmailSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssueMessage(parsed.error));
  const { email, token, password } = parsed.data;

  try {
    const result = await confirmEmailAddress(email, token, password);
    return result.success ? SUCCESS : fail(result.error);
  } catch (error) {
    await logger.error("Confirming the email failed", { error });
    return fail(GENERIC_ERROR_MESSAGE);
  }
}
