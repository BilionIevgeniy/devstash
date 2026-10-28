"use server";

import { z } from "zod";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import {
  getTooManyAttemptsMessage,
  RESET_EMAIL_BY_ADDRESS,
} from "@/features/auth/domain/rate-limits";
import { checkEmailSend } from "@/features/auth/services/email-rate-limit";
import {
  resetPasswordWithToken,
  sendPasswordResetLink,
} from "@/features/auth/services/password-reset";
import type { AuthActionState } from "@/features/auth/types";
import { getAppOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SUCCESS: AuthActionState = { success: true, data: null, error: null };

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Invalid email address"));

const resetPasswordSchema = z
  .object({
    email: emailSchema,
    token: z.string().min(1),
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      )
      .max(
        MAX_PASSWORD_LENGTH,
        `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

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

    const check = await checkEmailSend(RESET_EMAIL_BY_ADDRESS, parsed.data);
    if (check.status === "ip-limited") {
      return failure(getTooManyAttemptsMessage(check.reset, Date.now()));
    }
    if (check.status === "address-limited") return SUCCESS;

    const user = await prisma.user.findUnique({
      where: { email: parsed.data },
      select: { password: true },
    });
    if (!user?.password) return SUCCESS;

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
