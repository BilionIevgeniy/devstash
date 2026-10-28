import "server-only";

import { cache } from "react";
import { hashToken } from "@/features/auth/_internal/token";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import { isTokenExpired } from "@/features/auth/domain/verification-token";
import type { AccountState, UserProfile } from "@/features/auth/types";
import { prisma } from "@/lib/prisma";

// cache() lets the profile sections share one read per request.
export const getUserProfile = cache(
  async (userId: string): Promise<UserProfile | null> => {
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
  },
);

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
