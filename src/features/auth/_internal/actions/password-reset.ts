"use server";

import { headers } from "next/headers";
import {
  getTooManyAttemptsMessage,
  RESET_EMAIL_BY_ADDRESS,
} from "@/features/auth/domain/rate-limits";
import { getAccountState } from "@/features/auth/queries";
import { emailSchema, resetPasswordSchema } from "@/features/auth/schemas";
import { checkEmailSend } from "@/features/auth/services/email-rate-limit";
import {
  resetPasswordWithToken,
  sendPasswordResetLink,
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

    const check = await checkEmailSend(
      RESET_EMAIL_BY_ADDRESS,
      parsed.data,
      getClientIp(await headers()),
    );
    if (check.status === "ip-limited") {
      return failure(getTooManyAttemptsMessage(check.reset, Date.now()));
    }
    if (check.status === "address-limited") return SUCCESS;

    const account = await getAccountState(parsed.data);
    if (!account?.hasPassword) return SUCCESS;

    // A send failure is only logged: reporting it would reveal that the
    // account exists.
    await sendPasswordResetLink(parsed.data, origin);
    return SUCCESS;
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
