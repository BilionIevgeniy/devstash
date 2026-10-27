"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { MAX_PASSWORD_LENGTH } from "@/features/auth/domain/password-reset";
import {
  CONFIRM_EMAIL_BY_ADDRESS,
  getTooManyAttemptsMessage,
  VERIFICATION_EMAIL_BY_ADDRESS,
} from "@/features/auth/domain/rate-limits";
import {
  INVALID_LINK_ERROR,
  WRONG_CONFIRM_PASSWORD_MESSAGE,
} from "@/features/auth/domain/verification-token";
import { checkEmailSend } from "@/features/auth/email-rate-limit";
import {
  isVerificationTokenValid,
  sendVerificationLink,
  verifyEmailToken,
} from "@/features/auth/email-verification";
import { getAppOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import type { AuthActionState } from "@/features/auth/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SUCCESS: AuthActionState = { success: true, data: null, error: null };

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Invalid email address"));

const confirmEmailSchema = z.object({
  email: emailSchema,
  token: z.string().min(1),
  password: z
    .string()
    .min(1, "Password is required")
    .max(MAX_PASSWORD_LENGTH),
});

interface ConfirmEmailInput {
  email: string;
  token: string;
  password: string;
}

function failure(error: string): AuthActionState {
  return { success: false, data: null, error };
}

export async function resendVerificationEmail(
  email: string,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  try {
    // Read before any lookup so a missing APP_URL fails the same way for every
    // address and does not reveal which ones have an account.
    const origin = getAppOrigin();

    const check = await checkEmailSend(
      VERIFICATION_EMAIL_BY_ADDRESS,
      parsed.data,
    );
    if (check.status === "ip-limited") {
      return failure(getTooManyAttemptsMessage(check.reset, Date.now()));
    }
    if (check.status === "address-limited") return SUCCESS;

    const user = await prisma.user.findUnique({
      where: { email: parsed.data },
      select: { password: true, emailVerified: true },
    });
    if (!user?.password || user.emailVerified) return SUCCESS;

    const result = await sendVerificationLink(parsed.data, origin);
    if (!result.success) {
      return failure("We couldn't send the email. Please try again later.");
    }
    return SUCCESS;
  } catch (error) {
    console.error("Resending verification email failed:", error);
    return failure(GENERIC_ERROR);
  }
}

// Anyone can register an address they do not own, so holding the emailed link
// is not enough: the verifier must also know the password the account was
// created with. The owner of a pre-registered address does not and can use
// Forgot password instead.
export async function confirmEmail(
  input: ConfirmEmailInput,
): Promise<AuthActionState> {
  const parsed = confirmEmailSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const { email, token, password } = parsed.data;

  try {
    if (!(await isVerificationTokenValid(email, token))) {
      return failure(INVALID_LINK_ERROR);
    }
    const limit = await consumeRateLimit(CONFIRM_EMAIL_BY_ADDRESS, email);
    if (!limit.success) {
      return failure(getTooManyAttemptsMessage(limit.reset, Date.now()));
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { password: true },
    });
    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      return failure(WRONG_CONFIRM_PASSWORD_MESSAGE);
    }

    const result = await verifyEmailToken(email, token);
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);

    await resetRateLimit(CONFIRM_EMAIL_BY_ADDRESS, email);
    return SUCCESS;
  } catch (error) {
    console.error("Confirming the email failed:", error);
    return failure(GENERIC_ERROR);
  }
}
