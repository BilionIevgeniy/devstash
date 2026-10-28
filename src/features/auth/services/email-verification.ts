import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  buildVerificationUrl,
  getTokenExpiry,
  INVALID_LINK_ERROR,
  isTokenExpired,
  VERIFICATION_TOKEN_TTL_HOURS,
} from "@/features/auth/domain/verification-token";
import type { VerifyEmailResult } from "@/features/auth/types";
import { type EmailResult, sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const TOKEN_BYTES = 32;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function createVerificationToken(email: string): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const expires = getTokenExpiry(new Date());

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({
      data: { identifier: email, token: hashToken(token), expires },
    }),
  ]);
  return token;
}

export async function sendVerificationLink(
  email: string,
  origin: string,
): Promise<EmailResult> {
  let token: string;
  try {
    token = await createVerificationToken(email);
  } catch (error) {
    console.error("Failed to create verification token:", error);
    return { success: false, error: "Failed to create verification token" };
  }

  return sendVerificationEmail(
    email,
    buildVerificationUrl(origin, email, token),
    VERIFICATION_TOKEN_TTL_HOURS,
  );
}

// Read-only, so opening the link (or a mail scanner fetching it) changes nothing.
export async function isVerificationTokenValid(
  email: string,
  token: string,
): Promise<boolean> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  });
  if (!record || record.identifier !== email) return false;

  return !isTokenExpired(record.expires, new Date());
}

export async function verifyEmailToken(
  email: string,
  token: string,
): Promise<VerifyEmailResult> {
  const hashedToken = hashToken(token);

  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      if (!record || record.identifier !== email) {
        return { success: false, error: INVALID_LINK_ERROR };
      }

      // Only the request that actually deletes the token may verify the email,
      // so a link cannot be used twice by concurrent requests.
      const { count } = await tx.verificationToken.deleteMany({
        where: { token: hashedToken },
      });
      if (count !== 1 || isTokenExpired(record.expires, new Date())) {
        return { success: false, error: INVALID_LINK_ERROR };
      }

      await tx.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      });
      return { success: true, error: null };
    });
  } catch (error) {
    console.error("Failed to verify email:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
