import "server-only";

import { generateToken, hashToken } from "@/features/auth/_internal/token";
import { addressTokenIdentifiers } from "@/features/auth/domain/token-identifiers";
import { prisma } from "@/lib/postgres/prisma";

// Issues a new token for one kind of link of an address and returns it; only
// its hash is stored. One transaction replaces the earlier token of the same
// kind and removes every expired token of the address, so a user who asks for
// links again and again leaves no dead rows behind. The daily job removes the
// rest (services/retention.ts).
export async function replaceToken(
  identifier: string,
  email: string,
  expires: Date,
  now: Date,
): Promise<string> {
  const token = generateToken();

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.deleteMany({
      where: {
        identifier: { in: addressTokenIdentifiers(email) },
        expires: { lt: now },
      },
    }),
    prisma.verificationToken.create({
      data: { identifier, token: hashToken(token), expires },
    }),
  ]);
  return token;
}
