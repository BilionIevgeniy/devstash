import "server-only";

import { buildAccountDeletionEmail } from "@/features/auth/_internal/emails/account-deletion-email";
import { getDeletionCredentials } from "@/features/auth/_internal/queries";
import { replaceToken } from "@/features/auth/_internal/services/token-store";
import {
  ACCOUNT_DELETION_TOKEN_TTL_HOURS,
  buildAccountDeletionUrl,
  getAccountDeletionExpiry,
  getAccountDeletionIdentifier,
} from "@/features/auth/domain/account-deletion";
import { DELETION_EMAIL_BY_USER } from "@/features/auth/domain/rate-limits";
import { tooManyAttemptsParams } from "@/lib/http/retry-after";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";
import type { Locale } from "@/i18n/config";
import { sendEmail } from "@/lib/vendors/email";
import { consumeRateLimit } from "@/lib/vendors/rate-limit";

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

  const now = new Date();
  const token = await replaceToken(
    getAccountDeletionIdentifier(user.email),
    user.email,
    getAccountDeletionExpiry(now),
    now,
  );
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
