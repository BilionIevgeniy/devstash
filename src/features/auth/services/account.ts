import "server-only";

import bcrypt from "bcryptjs";
import { revokeGitHubGrant } from "@/features/auth/_internal/services/github-grant";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import {
  isRecentlyAuthenticated,
  REAUTH_REQUIRED_MESSAGE,
  requiresReauthentication,
} from "@/features/auth/domain/reauth";
import type {
  ChangePasswordResult,
  DeleteAccountResult,
} from "@/features/auth/types";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;
const NO_PASSWORD_MESSAGE = "This account has no password to change";
const INCORRECT_PASSWORD_MESSAGE = "Current password is incorrect";
const INCORRECT_DELETE_PASSWORD_MESSAGE = "Password is incorrect";

interface DeleteAccountProof {
  /** Required for accounts that have a password. */
  password?: string;
  /** Epoch ms of the session's sign-in; checked for accounts without one. */
  authenticatedAt?: number;
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user?.password) return { success: false, error: NO_PASSWORD_MESSAGE };

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return { success: false, error: INCORRECT_PASSWORD_MESSAGE };
  }

  const password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password, sessionVersion: { increment: 1 } },
  });
  return { success: true, error: null };
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
// has none.
//
// Items, collections, tags, custom types, accounts and sessions go with the
// user through the schema's onDelete: Cascade. Verification and reset tokens
// have no relation to User, so they are removed by identifier.
export async function deleteUserAccount(
  userId: string,
  proof: DeleteAccountProof,
): Promise<DeleteAccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, password: true },
  });
  if (!user) return { success: true, error: null };

  if (user.password) {
    if (
      !proof.password ||
      !(await bcrypt.compare(proof.password, user.password))
    ) {
      return { success: false, error: INCORRECT_DELETE_PASSWORD_MESSAGE };
    }
  } else if (!isRecentlyAuthenticated(proof.authenticatedAt, Date.now())) {
    return { success: false, error: REAUTH_REQUIRED_MESSAGE };
  }

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
        identifier: { in: [user.email, getPasswordResetIdentifier(user.email)] },
      },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  return { success: true, error: null };
}
