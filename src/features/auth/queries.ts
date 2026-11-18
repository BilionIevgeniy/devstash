import "server-only";

import { staleRegistrationWhere } from "@/features/auth/_internal/queries";
import { hashToken } from "@/features/auth/_internal/token";
import {
  deletionLinkState,
  getAccountDeletionIdentifier,
  type DeletionLinkState,
} from "@/features/auth/domain/account-deletion";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import { staleRegistrationCutoff } from "@/features/auth/domain/registration";
import { isTokenExpired } from "@/features/auth/domain/verification-token";
import type { AccountState, UserProfile } from "@/features/auth/types";
import { prisma } from "@/lib/postgres/prisma";

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
      createdAt: true,
      password: true,
    },
  });
  if (!user) return null;

  const { password, ...profile } = user;
  return { ...profile, hasPassword: password !== null };
}

// The one read by email alone (ADR 0032, rule 4 of architecture-rules.md):
// the signed-out § 312k cancellation names its contract by the account's
// email. Only the id comes back; the caller never tells the requester whether
// it found one. The email is normalised by emailSchema, as at registration.
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function getSessionVersion(
  userId: string,
): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  return user?.sessionVersion ?? null;
}

// The reads below run before anyone is signed in. They are keyed by an email
// address (and a one-time token) instead of a user id, which is the one
// exception to scoping every query by userId.

// Callers must answer the same way for a missing and an existing account, or
// they reveal which addresses are registered.
export async function getAccountState(
  email: string,
): Promise<AccountState | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { password: true, emailVerified: true },
  });
  if (!user) return null;

  return {
    hasPassword: user.password !== null,
    isEmailVerified: user.emailVerified !== null,
  };
}

async function isTokenValid(
  identifier: string,
  token: string,
): Promise<boolean> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  });
  if (!record || record.identifier !== identifier) return false;

  return !isTokenExpired(record.expires, new Date());
}

// Read-only, so opening the link (or a mail scanner fetching it) changes nothing.
export function isVerificationTokenValid(
  email: string,
  token: string,
): Promise<boolean> {
  return isTokenValid(email, token);
}

export function isPasswordResetTokenValid(
  email: string,
  token: string,
): Promise<boolean> {
  return isTokenValid(getPasswordResetIdentifier(email), token);
}

// Read-only, so opening the deletion link changes nothing: the delete is a
// separate click on the page it opens.
export function isAccountDeletionTokenValid(
  email: string,
  token: string,
): Promise<boolean> {
  return isTokenValid(getAccountDeletionIdentifier(email), token);
}

// For the daily job: one page of the ids of registrations never verified within
// UNVERIFIED_REGISTRATION_DAYS, in id order after `afterId`. Not scoped by a
// user, since it finds who is due across all of them (ADR 0030); each id then
// goes through the deletion proof of services/account.
export async function getStaleRegistrationIds(
  now: Date,
  afterId: string | null,
  take: number,
): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      ...staleRegistrationWhere(staleRegistrationCutoff(now)),
      ...(afterId && { id: { gt: afterId } }),
    },
    orderBy: { id: "asc" },
    select: { id: true },
    take,
  });
  return users.map(({ id }) => id);
}

// What the page of the deletion link shows for the signed-in user: the
// confirm button, an expired link, or a link for another account. Null when
// the user is gone. Read-only: opening the link deletes nothing.
export async function getDeletionLinkState(
  userId: string,
  linkEmail: string,
  token: string,
): Promise<DeletionLinkState | null> {
  const profile = await getUserProfile(userId);
  if (!profile) return null;
  const isTokenValid =
    linkEmail === profile.email &&
    (await isAccountDeletionTokenValid(linkEmail, token));
  return deletionLinkState(profile, linkEmail, isTokenValid);
}
