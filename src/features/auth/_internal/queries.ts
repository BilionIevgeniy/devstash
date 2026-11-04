import "server-only";

import { prisma } from "@/lib/prisma";

// Reads that hand a secret (a password hash, an OAuth token) to their caller.
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

export async function getGitHubAccessTokens(userId: string): Promise<string[]> {
  const accounts = await prisma.account.findMany({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });
  return accounts.flatMap(({ access_token }) =>
    access_token ? [access_token] : [],
  );
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
