import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/postgres/prisma";

// Reads that hand a secret (a password hash) to their caller.
// They live here and not in auth/queries.ts so that nothing outside auth can
// import them (ADR 0009). A read that reduces the secret to a boolean, such as
// getAccountState, is an ordinary query.

interface CredentialsUser {
  id: string;
  email: string;
  name: string | null;
  password: string | null;
  emailVerified: Date | null;
}

interface DeletionCredentials {
  email: string;
  password: string | null;
}

export async function getPasswordHash(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  return user?.password ?? null;
}

export async function getDeletionCredentials(
  userId: string,
): Promise<DeletionCredentials | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, password: true },
  });
}

// The two reads below are keyed by an email address: their callers hold no user
// id yet, and the password they are about to check is the authorization.

export async function getPasswordHashByEmail(
  email: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { password: true },
  });
  return user?.password ?? null;
}

export async function getCredentialsUser(
  email: string,
): Promise<CredentialsUser | null> {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      emailVerified: true,
    },
  });
}

// A registration with a password whose email was never verified, created
// before the cutoff. A GitHub account also has no verified email (Auth.js
// leaves it null) and must never match, hence no linked Account. Shared by the
// daily job's reads and its delete, so a verification in between keeps the
// account.
export function staleRegistrationWhere(cutoff: Date): Prisma.UserWhereInput {
  return {
    password: { not: null },
    emailVerified: null,
    accounts: { none: {} },
    createdAt: { lt: cutoff },
  };
}

// The address of a stale registration, for the deletion proof of the daily
// job; null once the user verified, linked GitHub or is gone.
export async function getStaleRegistration(
  userId: string,
  cutoff: Date,
): Promise<{ email: string } | null> {
  return prisma.user.findFirst({
    where: { id: userId, ...staleRegistrationWhere(cutoff) },
    select: { email: true },
  });
}
