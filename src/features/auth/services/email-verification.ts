import "server-only";

import { buildVerificationEmail } from "@/features/auth/_internal/emails/verification-email";
import { generateToken, hashToken } from "@/features/auth/_internal/token";
import {
  CONFIRM_EMAIL_BY_ADDRESS,
  tooManyAttemptsParams,
  VERIFICATION_EMAIL_BY_ADDRESS,
} from "@/features/auth/domain/rate-limits";
import { shouldResendVerification } from "@/features/auth/domain/registration";
import {
  buildVerificationUrl,
  getTokenExpiry,
  isTokenExpired,
  VERIFICATION_TOKEN_TTL_HOURS,
} from "@/features/auth/domain/verification-token";
import {
  getAccountState,
  isVerificationTokenValid,
} from "@/features/auth/queries";
import { verifyPasswordByEmail } from "@/features/auth/services/account";
import { checkEmailSend } from "@/features/auth/services/email-rate-limit";
import { fail, ok, type OperationResult } from "@/lib/action-result";
import { sendEmail } from "@/lib/email";
import type { Locale } from "@/i18n/config";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";

const SUCCESS: OperationResult = ok();
async function createVerificationToken(email: string): Promise<string> {
  const token = generateToken();
  const expires = getTokenExpiry(new Date());

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({
      data: { identifier: email, token: hashToken(token), expires },
    }),
  ]);
  return token;
}

export async function sendVerificationLink(
  email: string,
  origin: string,
  locale: Locale,
): Promise<OperationResult> {
  let token: string;
  try {
    token = await createVerificationToken(email);
  } catch (error) {
    await logger.error("Failed to create verification token", { error });
    return fail("generic");
  }

  return sendEmail({
    to: email,
    ...buildVerificationEmail(
      buildVerificationUrl(origin, email, token),
      VERIFICATION_TOKEN_TTL_HOURS,
      locale,
    ),
  });
}

// Every outcome except an exhausted per-IP limit or a failed send is the same
// neutral success, so the answer never shows whether the address has an account.
export async function resendVerificationLink(
  email: string,
  origin: string,
  ip: string | null,
  locale: Locale,
): Promise<OperationResult> {
  const check = await checkEmailSend(VERIFICATION_EMAIL_BY_ADDRESS, email, ip);
  if (check.status === "ip-limited") {
    return fail(
      "tooManyAttempts",
      tooManyAttemptsParams(check.reset, Date.now()),
    );
  }
  if (check.status === "address-limited") return SUCCESS;

  const account = await getAccountState(email);
  if (!account || !shouldResendVerification(account)) return SUCCESS;

  const result = await sendVerificationLink(email, origin, locale);
  return result.success ? SUCCESS : fail("emailSendFailed");
}

// Anyone can register an address they do not own, so holding the emailed link
// is not enough: the verifier must also know the password the account was
// created with. The owner of a pre-registered address does not and can use
// Forgot password instead.
export async function confirmEmailAddress(
  email: string,
  token: string,
  password: string,
): Promise<OperationResult> {
  if (!(await isVerificationTokenValid(email, token))) {
    return fail("invalidVerificationLink");
  }

  const limit = await consumeRateLimit(CONFIRM_EMAIL_BY_ADDRESS, email);
  if (!limit.success) {
    return fail(
      "tooManyAttempts",
      tooManyAttemptsParams(limit.reset, Date.now()),
    );
  }

  if (!(await verifyPasswordByEmail(email, password))) {
    return fail("wrongConfirmPassword");
  }

  const result = await verifyEmailToken(email, token);
  if (!result.success) return result;

  await resetRateLimit(CONFIRM_EMAIL_BY_ADDRESS, email);
  return SUCCESS;
}

export async function verifyEmailToken(
  email: string,
  token: string,
): Promise<OperationResult> {
  const hashedToken = hashToken(token);

  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      if (!record || record.identifier !== email) {
        return fail("invalidVerificationLink");
      }

      // Only the request that actually deletes the token may verify the email,
      // so a link cannot be used twice by concurrent requests.
      const { count } = await tx.verificationToken.deleteMany({
        where: { token: hashedToken },
      });
      if (count !== 1 || isTokenExpired(record.expires, new Date())) {
        return fail("invalidVerificationLink");
      }

      await tx.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      });
      return ok();
    });
  } catch (error) {
    await logger.error("Failed to verify email", { error });
    return fail("generic");
  }
}
