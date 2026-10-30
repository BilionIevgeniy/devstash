import "server-only";

import bcrypt from "bcryptjs";
import { hashPassword } from "@/features/auth/_internal/password";
import { revokeGitHubGrant } from "@/features/auth/_internal/services/github-grant";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import {
  getTooManyAttemptsMessage,
  PASSWORD_CHECK_BY_USER,
} from "@/features/auth/domain/rate-limits";
import {
  isRecentlyAuthenticated,
  REAUTH_REQUIRED_MESSAGE,
  requiresReauthentication,
} from "@/features/auth/domain/reauth";
import type { OperationResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";

const NO_PASSWORD_MESSAGE = "This account has no password to change";
const INCORRECT_PASSWORD_MESSAGE = "Current password is incorrect";
const INCORRECT_DELETE_PASSWORD_MESSAGE = "Password is incorrect";

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

export interface VerifyAccountDeletionResult extends OperationResult {
  /** null with success: the user is already gone, so there is nothing to do. */
  data: VerifiedDeletion | null;
}

// Changing and deleting share one counter per user, so guessing the password
// through either one uses up the same attempts.
async function getPasswordCheckRefusal(
  userId: string,
): Promise<OperationResult | null> {
  const limit = await consumeRateLimit(PASSWORD_CHECK_BY_USER, userId);
  if (limit.success) return null;

  return {
    success: false,
    error: getTooManyAttemptsMessage(limit.reset, Date.now()),
  };
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<OperationResult> {
  const refusal = await getPasswordCheckRefusal(userId);
  if (refusal) return refusal;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user?.password) return { success: false, error: NO_PASSWORD_MESSAGE };

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return { success: false, error: INCORRECT_PASSWORD_MESSAGE };
  }

  const password = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password, sessionVersion: { increment: 1 } },
  });
  await resetRateLimit(PASSWORD_CHECK_BY_USER, userId);
  return { success: true, error: null };
}

// For callers that hold no user id yet, such as the emailed confirmation link.
export async function verifyPasswordByEmail(
  email: string,
  password: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { password: true },
  });
  return user?.password ? bcrypt.compare(password, user.password) : false;
}

// The clock is read here and not in the profile component, which must stay pure.
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
  if (refusal) return { ...refusal, data: null };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, password: true },
  });
  if (!user) return { success: true, error: null, data: null };

  if (user.password) {
    if (
      !proof.password ||
      !(await bcrypt.compare(proof.password, user.password))
    ) {
      return {
        success: false,
        error: INCORRECT_DELETE_PASSWORD_MESSAGE,
        data: null,
      };
    }
  } else if (!isRecentlyAuthenticated(proof.authenticatedAt, Date.now())) {
    return { success: false, error: REAUTH_REQUIRED_MESSAGE, data: null };
  }

  await resetRateLimit(PASSWORD_CHECK_BY_USER, userId);
  return {
    success: true,
    error: null,
    data: { userId, email: user.email } as VerifiedDeletion,
  };
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
  // Taking the app's authorization away on GitHub makes the next GitHub
  // sign-in start from GitHub's authorize screen and create a new account. The
  // stored token is the one from the first link, so it may already be revoked.
  const githubAccounts = await prisma.account.findMany({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });
  for (const { access_token } of githubAccounts) {
    if (access_token) await revokeGitHubGrant(access_token);
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
