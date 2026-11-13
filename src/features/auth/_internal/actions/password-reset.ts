"use server";

import { headers } from "next/headers";
import { emailSchema, resetPasswordSchema } from "@/features/auth/schemas";
import {
  requestPasswordResetLink,
  resetPasswordWithToken,
} from "@/features/auth/services/password-reset";
import type { AuthActionState } from "@/features/auth/types";
import { getAppOrigin } from "@/lib/app-url";
import { getClientIp } from "@/lib/client-ip";
import { logger } from "@/lib/logger";
import { fail, ok } from "@/lib/action-result";
import { firstIssue } from "@/lib/validation";

const SUCCESS: AuthActionState = ok();

interface ResetPasswordInput {
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
}

export async function requestPasswordReset(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return firstIssue(parsed.error);

  try {
    const origin = getAppOrigin();

    const result = await requestPasswordResetLink(
      parsed.data,
      origin,
      getClientIp(await headers()),
    );
    return result.success ? SUCCESS : result;
  } catch (error) {
    await logger.error("Requesting a password reset failed", { error });
    return fail("generic");
  }
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  const { email, token, password } = parsed.data;
  const result = await resetPasswordWithToken(email, token, password);
  if (!result.success) return result;

  return SUCCESS;
}
