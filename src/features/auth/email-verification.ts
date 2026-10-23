import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  buildVerificationUrl,
  getTokenExpiry,
  isTokenExpired,
  VERIFICATION_TOKEN_TTL_HOURS,
  wasSentWithinCooldown,
} from "@/features/auth/domain/verification-token";
import type { VerifyEmailResult } from "@/features/auth/types";
import { type EmailResult, sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const INVALID_LINK_ERROR =
  "This verification link is invalid or has expired";

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

export async function wasLinkSentRecently(email: string): Promise<boolean> {
  const latest = await prisma.verificationToken.findFirst({
    where: { identifier: email },
    orderBy: { expires: "desc" },
    select: { expires: true },
  });
  if (!latest) return false;

  return wasSentWithinCooldown(latest.expires, new Date());
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

export async function verifyEmailToken(
  email: string,
  token: string,
): Promise<VerifyEmailResult> {
  const hashedToken = hashToken(token);

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
    });
    if (!record || record.identifier !== email) {
      return { success: false, error: INVALID_LINK_ERROR };
    }

    if (isTokenExpired(record.expires, new Date())) {
      await prisma.verificationToken.deleteMany({
        where: { token: hashedToken },
      });
      return { success: false, error: INVALID_LINK_ERROR };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.deleteMany({ where: { token: hashedToken } }),
    ]);
    return { success: true, error: null };
  } catch (error) {
    console.error("Failed to verify email:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
