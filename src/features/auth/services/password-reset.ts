import "server-only";

import { buildPasswordResetEmail } from "@/features/auth/_internal/emails/password-reset-email";
import { hashPassword } from "@/features/auth/_internal/password";
import { generateToken, hashToken } from "@/features/auth/_internal/token";
import {
  buildPasswordResetUrl,
  getPasswordResetExpiry,
  getPasswordResetIdentifier,
  PASSWORD_RESET_TOKEN_TTL_HOURS,
} from "@/features/auth/domain/password-reset";
import {
  tooManyAttemptsParams,
  RESET_EMAIL_BY_ADDRESS,
} from "@/features/auth/domain/rate-limits";
import { isTokenExpired } from "@/features/auth/domain/verification-token";
import {
  getAccountState,
  isPasswordResetTokenValid,
} from "@/features/auth/queries";
import { checkEmailSend } from "@/features/auth/services/email-rate-limit";
import { fail, ok, type OperationResult } from "@/lib/action-result";
import { sendEmail } from "@/lib/email";
import type { Locale } from "@/i18n/config";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

async function createPasswordResetToken(email: string): Promise<string> {
  const identifier = getPasswordResetIdentifier(email);
  const token = generateToken();
  const expires = getPasswordResetExpiry(new Date());

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hashToken(token), expires },
    }),
  ]);
  return token;
}

export async function sendPasswordResetLink(
  email: string,
  origin: string,
  locale: Locale,
): Promise<OperationResult> {
  let token: string;
  try {
    token = await createPasswordResetToken(email);
  } catch (error) {
    await logger.error("Failed to create password reset token", { error });
    return fail("generic");
  }

  return sendEmail({
    to: email,
    ...buildPasswordResetEmail(
      buildPasswordResetUrl(origin, email, token),
      PASSWORD_RESET_TOKEN_TTL_HOURS,
      locale,
    ),
  });
}

// Every outcome except an exhausted per-IP limit is the same neutral success,
// so the answer never shows whether the address has an account. For the same
// reason a send failure is only logged.
export async function requestPasswordResetLink(
  email: string,
  origin: string,
  ip: string | null,
  locale: Locale,
): Promise<OperationResult> {
  const check = await checkEmailSend(RESET_EMAIL_BY_ADDRESS, email, ip);
  if (check.status === "ip-limited") {
    return fail(
      "tooManyAttempts",
      tooManyAttemptsParams(check.reset, Date.now()),
    );
  }
  if (check.status === "address-limited") return ok();

  const account = await getAccountState(email);
  if (!account?.hasPassword) return ok();

  await sendPasswordResetLink(email, origin, locale);
  return ok();
}

export async function resetPasswordWithToken(
  email: string,
  token: string,
  newPassword: string,
): Promise<OperationResult> {
  const hashedToken = hashToken(token);
  const identifier = getPasswordResetIdentifier(email);

  try {
    // Cheap gate so requests with a bad token never pay for a bcrypt hash;
    // the transaction below stays the authoritative check.
    if (!(await isPasswordResetTokenValid(email, token))) {
      return fail("invalidResetLink");
    }

    const password = await hashPassword(newPassword);
    return await prisma.$transaction(async (tx) => {
      const record = await tx.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      if (
        !record ||
        record.identifier !== identifier ||
        isTokenExpired(record.expires, new Date())
      ) {
        return fail("invalidResetLink");
      }

      // Only the request that actually deletes the token may set the password,
      // so a link cannot be used twice by concurrent requests.
      const { count } = await tx.verificationToken.deleteMany({
        where: { token: hashedToken },
      });
      if (count !== 1) {
        return fail("invalidResetLink");
      }

      await tx.user.update({
        where: { email },
        data: { password, sessionVersion: { increment: 1 } },
      });
      return ok();
    });
  } catch (error) {
    await logger.error("Failed to reset password", { error });
    return fail("generic");
  }
}
