"use server";

import { headers } from "next/headers";
import {
  CONFIRM_EMAIL_BY_ADDRESS,
  getTooManyAttemptsMessage,
  VERIFICATION_EMAIL_BY_ADDRESS,
} from "@/features/auth/domain/rate-limits";
import { shouldResendVerification } from "@/features/auth/domain/registration";
import {
  INVALID_LINK_ERROR,
  WRONG_CONFIRM_PASSWORD_MESSAGE,
} from "@/features/auth/domain/verification-token";
import {
  getAccountState,
  isVerificationTokenValid,
} from "@/features/auth/queries";
import { confirmEmailSchema, emailSchema } from "@/features/auth/schemas";
import { verifyPasswordByEmail } from "@/features/auth/services/account";
import { checkEmailSend } from "@/features/auth/services/email-rate-limit";
import {
  sendVerificationLink,
  verifyEmailToken,
} from "@/features/auth/services/email-verification";
import type { AuthActionState } from "@/features/auth/types";
import { getAppOrigin } from "@/lib/app-url";
import { getClientIp } from "@/lib/client-ip";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SUCCESS: AuthActionState = { success: true, data: null, error: null };

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
      getClientIp(await headers()),
    );
    if (check.status === "ip-limited") {
      return failure(getTooManyAttemptsMessage(check.reset, Date.now()));
    }
    if (check.status === "address-limited") return SUCCESS;

    const account = await getAccountState(parsed.data);
    if (!account || !shouldResendVerification(account)) return SUCCESS;

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

    if (!(await verifyPasswordByEmail(email, password))) {
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
