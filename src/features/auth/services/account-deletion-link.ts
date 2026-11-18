import "server-only";

import { buildAccountDeletionEmail } from "@/features/auth/_internal/emails/account-deletion-email";
import { getDeletionCredentials } from "@/features/auth/_internal/queries";
import { generateToken, hashToken } from "@/features/auth/_internal/token";
import {
  ACCOUNT_DELETION_TOKEN_TTL_HOURS,
  buildAccountDeletionUrl,
  getAccountDeletionExpiry,
  getAccountDeletionIdentifier,
} from "@/features/auth/domain/account-deletion";
import {
  DELETION_EMAIL_BY_USER,
  tooManyAttemptsParams,
} from "@/features/auth/domain/rate-limits";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";
import type { Locale } from "@/i18n/config";
import { prisma } from "@/lib/postgres/prisma";
import { sendEmail } from "@/lib/vendors/email";
import { consumeRateLimit } from "@/lib/vendors/rate-limit";

async function createAccountDeletionToken(email: string): Promise<string> {
  const identifier = getAccountDeletionIdentifier(email);
  const token = generateToken();
  const expires = getAccountDeletionExpiry(new Date());

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hashToken(token), expires },
    }),
  ]);
  return token;
}

// Emails the signed-in user the link that confirms deleting an account with no
// password. The address is the account's own, read here by its id: the caller
// never chooses where the link goes. An account with a password confirms with
// it instead and gets no link.
export async function sendAccountDeletionLink(
  userId: string,
  origin: string,
  locale: Locale,
): Promise<OperationResult> {
  const user = await getDeletionCredentials(userId);
  if (!user) return fail("signedOut");
  if (user.password) return fail("generic");

  const limit = await consumeRateLimit(DELETION_EMAIL_BY_USER, userId);
  if (!limit.success) {
    return fail(
      "tooManyAttempts",
      tooManyAttemptsParams(limit.reset, Date.now()),
    );
  }

  const token = await createAccountDeletionToken(user.email);
  const result = await sendEmail({
    to: user.email,
    ...buildAccountDeletionEmail(
      buildAccountDeletionUrl(origin, user.email, token),
      ACCOUNT_DELETION_TOKEN_TTL_HOURS,
      locale,
    ),
  });
  return result.success ? ok() : result;
}
