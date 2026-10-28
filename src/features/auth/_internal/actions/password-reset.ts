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

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SUCCESS: AuthActionState = { success: true, data: null, error: null };

interface ResetPasswordInput {
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
}

function failure(error: string): AuthActionState {
  return { success: false, data: null, error };
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  try {
    const origin = getAppOrigin();

    const result = await requestPasswordResetLink(
      parsed.data,
      origin,
      getClientIp(await headers()),
    );
    return result.success ? SUCCESS : failure(result.error ?? GENERIC_ERROR);
  } catch (error) {
    console.error("Requesting a password reset failed:", error);
    return failure(GENERIC_ERROR);
  }
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  const { email, token, password } = parsed.data;
  const result = await resetPasswordWithToken(email, token, password);
  if (!result.success) return failure(result.error ?? GENERIC_ERROR);

  return SUCCESS;
}
