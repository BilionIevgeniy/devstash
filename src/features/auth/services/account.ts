import "server-only";

import bcrypt from "bcryptjs";
import {
  hashPassword,
  verifyPassword,
} from "@/features/auth/_internal/password";
import {
  getDeletionCredentials,
  getPasswordHash,
  getPasswordHashByEmail,
  getStaleRegistration,
  staleRegistrationWhere,
} from "@/features/auth/_internal/queries";
import { staleRegistrationCutoff } from "@/features/auth/domain/registration";
import { addressTokenIdentifiers } from "@/features/auth/domain/token-identifiers";
import {
  tooManyAttemptsParams,
  PASSWORD_CHECK_BY_USER,
} from "@/features/auth/domain/rate-limits";
import { isAccountDeletionTokenValid } from "@/features/auth/queries";
import {
  fail,
  ok,
  type Failure,
  type OperationResult,
} from "@/lib/errors/action-result";
import { prisma } from "@/lib/postgres/prisma";
import { consumeRateLimit, resetRateLimit } from "@/lib/vendors/rate-limit";

export interface DeleteAccountProof {
  /** Required for accounts that have a password. */
  password?: string;
  /** The token of the emailed deletion link; required for accounts without one. */
  deletionToken?: string;
}

// Not exported: only verifyAccountDeletion and verifyStaleRegistration can
// build a VerifiedDeletion, so deleteVerifiedUserRows cannot be called without
// a proof check.
declare const verified: unique symbol;

export interface VerifiedDeletion {
  readonly userId: string;
  readonly email: string;
  /** Set for a stale registration: the rows go only while it still is one. */
  readonly staleBefore?: Date;
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

// A valid session alone is not enough to delete an account: the caller proves
// it is the owner with the password, or, when the account has none, with the
// token of the link emailed to the account's own address. The token is checked
// against the address read here by the user id, never the one in the link. It
// is not used up: the row delete removes every token of the address with the
// user, so a delete that fails later (R2 down) can be retried from the link.
// A passed check resets the shared counter, as a password change does, so a
// retried delete cannot lock the user out.
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
  } else if (
    !proof.deletionToken ||
    !(await isAccountDeletionTokenValid(user.email, proof.deletionToken))
  ) {
    return fail("invalidDeletionLink");
  }

  await resetRateLimit(PASSWORD_CHECK_BY_USER, userId);
  return ok({ userId, email: user.email } as VerifiedDeletion);
}

// The proof of the daily job for a registration never verified within
// UNVERIFIED_REGISTRATION_DAYS: the conditions are read again here with the
// cutoff of `now`, so no caller can pass its own. Null when the user verified,
// linked GitHub or is gone in the meantime.
export async function verifyStaleRegistration(
  userId: string,
  now: Date,
): Promise<VerifiedDeletion | null> {
  const staleBefore = staleRegistrationCutoff(now);
  const user = await getStaleRegistration(userId, staleBefore);
  if (!user) return null;
  return { userId, email: user.email, staleBefore } as VerifiedDeletion;
}

// Called only by account's delete flow, after it has purged the user's files.
// True when the user row went; false only for a stale registration that was
// verified in the meantime.
//
// Items, collections, tags, custom types, accounts and sessions go with the
// user through the schema's onDelete: Cascade. Verification and reset tokens
// have no relation to User, so they are removed by identifier.
export async function deleteVerifiedUserRows({
  userId,
  email,
  staleBefore,
}: VerifiedDeletion): Promise<boolean> {
  if (staleBefore) {
    return deleteStaleRegistrationRows(userId, email, staleBefore);
  }

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: {
        identifier: { in: addressTokenIdentifiers(email) },
      },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  return true;
}

// A verification that lands between the job's proof and this delete keeps the
// user, and with it the tokens of the address.
async function deleteStaleRegistrationRows(
  userId: string,
  email: string,
  staleBefore: Date,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.user.deleteMany({
      where: { id: userId, ...staleRegistrationWhere(staleBefore) },
    });
    if (count !== 1) return false;
    await tx.verificationToken.deleteMany({
      where: { identifier: { in: addressTokenIdentifiers(email) } },
    });
    return true;
  });
}
