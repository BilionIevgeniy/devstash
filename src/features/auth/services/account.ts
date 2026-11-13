import "server-only";

import bcrypt from "bcryptjs";
import {
  hashPassword,
  verifyPassword,
} from "@/features/auth/_internal/password";
import {
  getDeletionCredentials,
  getGitHubAccessTokens,
  getPasswordHash,
  getPasswordHashByEmail,
} from "@/features/auth/_internal/queries";
import { revokeGitHubGrant } from "@/features/auth/_internal/services/github-grant";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import {
  tooManyAttemptsParams,
  PASSWORD_CHECK_BY_USER,
} from "@/features/auth/domain/rate-limits";
import {
  isRecentlyAuthenticated,
  requiresReauthentication,
} from "@/features/auth/domain/reauth";
import {
  fail,
  ok,
  type Failure,
  type OperationResult,
} from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";

export interface DeleteAccountProof {
  /** Required for accounts that have a password. */
  password?: string;
  /** Epoch ms of the session's sign-in; checked for accounts without one. */
  authenticatedAt?: number;
}

// Not exported: only verifyAccountDeletion can build a VerifiedDeletion, so
// deleteVerifiedUserRows cannot be called without the proof check.
declare const verified: unique symbol;

export interface VerifiedDeletion {
  readonly userId: string;
  readonly email: string;
  readonly [verified]: true;
}

/** data is null with success: the user is already gone, nothing to do. */
export type VerifyAccountDeletionResult =
  OperationResult<VerifiedDeletion | null>;

// Changing and deleting share one counter per user, so guessing the password
// through either one uses up the same attempts.
async function getPasswordCheckRefusal(
  userId: string,
): Promise<Failure | null> {
  const limit = await consumeRateLimit(PASSWORD_CHECK_BY_USER, userId);
  if (limit.success) return null;

  return fail(
    "tooManyAttempts",
    tooManyAttemptsParams(limit.reset, Date.now()),
  );
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<OperationResult> {
  const refusal = await getPasswordCheckRefusal(userId);
  if (refusal) return refusal;

  const hash = await getPasswordHash(userId);
  if (!hash) return fail("noPasswordToChange");

  if (!(await bcrypt.compare(currentPassword, hash))) {
    return fail("incorrectCurrentPassword");
  }

  const password = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password, sessionVersion: { increment: 1 } },
  });
  await resetRateLimit(PASSWORD_CHECK_BY_USER, userId);
  return ok();
}

// For callers that hold no user id yet, such as the emailed confirmation link.
export async function verifyPasswordByEmail(
  email: string,
  password: string,
): Promise<boolean> {
  return verifyPassword(password, await getPasswordHashByEmail(email));
}

// The clock is read here and not in the settings component, which must stay pure.
export function needsReauthentication(
  hasPassword: boolean,
  authenticatedAt: number | undefined,
): boolean {
  return requiresReauthentication(hasPassword, authenticatedAt, Date.now());
}

// A valid session alone is not enough to delete an account: the caller proves
// it is the owner with the password, or with a recent sign-in when the account
// has none. A passed check resets the shared counter, as a password change
// does, so a delete that fails later (R2 down) and is retried with the right
// password cannot lock the user out.
export async function verifyAccountDeletion(
  userId: string,
  proof: DeleteAccountProof,
): Promise<VerifyAccountDeletionResult> {
  const refusal = await getPasswordCheckRefusal(userId);
  if (refusal) return refusal;

  const user = await getDeletionCredentials(userId);
  if (!user) return ok();

  if (user.password) {
    if (
      !proof.password ||
      !(await bcrypt.compare(proof.password, user.password))
    ) {
      return fail("incorrectPassword");
    }
  } else if (!isRecentlyAuthenticated(proof.authenticatedAt, Date.now())) {
    return fail("reauthRequired");
  }

  await resetRateLimit(PASSWORD_CHECK_BY_USER, userId);
  return ok({ userId, email: user.email } as VerifiedDeletion);
}

// Called only by account's delete flow, after it has purged the user's files.
//
// Items, collections, tags, custom types, accounts and sessions go with the
// user through the schema's onDelete: Cascade. Verification and reset tokens
// have no relation to User, so they are removed by identifier.
export async function deleteVerifiedUserRows({
  userId,
  email,
}: VerifiedDeletion): Promise<void> {
  // Best effort, for rows from before tokens stopped being stored: a newer row
  // has no token and an older one is usually dead, so the app's authorization
  // on GitHub normally outlives the account.
  for (const token of await getGitHubAccessTokens(userId)) {
    await revokeGitHubGrant(token);
  }

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: {
        identifier: { in: [email, getPasswordResetIdentifier(email)] },
      },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}
