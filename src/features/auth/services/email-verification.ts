import "server-only";

import { buildVerificationEmail } from "@/features/auth/_internal/emails/verification-email";
import { generateToken, hashToken } from "@/features/auth/_internal/token";
import {
  buildVerificationUrl,
  getTokenExpiry,
  INVALID_LINK_ERROR,
  isTokenExpired,
  VERIFICATION_TOKEN_TTL_HOURS,
} from "@/features/auth/domain/verification-token";
import type { OperationResult } from "@/lib/action-result";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

async function createVerificationToken(email: string): Promise<string> {
  const token = generateToken();
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
): Promise<OperationResult> {
  let token: string;
  try {
    token = await createVerificationToken(email);
  } catch (error) {
    console.error("Failed to create verification token:", error);
    return { success: false, error: "Failed to create verification token" };
  }

  return sendEmail({
    to: email,
    ...buildVerificationEmail(
      buildVerificationUrl(origin, email, token),
      VERIFICATION_TOKEN_TTL_HOURS,
    ),
  });
}

export async function verifyEmailToken(
  email: string,
  token: string,
): Promise<OperationResult> {
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
