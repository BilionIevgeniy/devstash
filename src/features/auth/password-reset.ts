import "server-only";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  buildPasswordResetUrl,
  getPasswordResetExpiry,
  getPasswordResetIdentifier,
  INVALID_RESET_LINK_MESSAGE,
  PASSWORD_RESET_TOKEN_TTL_HOURS,
  wasResetSentWithinCooldown,
} from "@/features/auth/domain/password-reset";
import { isTokenExpired } from "@/features/auth/domain/verification-token";
import { hashToken } from "@/features/auth/email-verification";
import type { PasswordResetResult } from "@/features/auth/types";
import { type EmailResult, sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const TOKEN_BYTES = 32;
const BCRYPT_ROUNDS = 12;

async function createPasswordResetToken(email: string): Promise<string> {
  const identifier = getPasswordResetIdentifier(email);
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const expires = getPasswordResetExpiry(new Date());

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hashToken(token), expires },
    }),
  ]);
  return token;
}

export async function wasResetLinkSentRecently(email: string): Promise<boolean> {
  const latest = await prisma.verificationToken.findFirst({
    where: { identifier: getPasswordResetIdentifier(email) },
    orderBy: { expires: "desc" },
    select: { expires: true },
  });
  if (!latest) return false;

  return wasResetSentWithinCooldown(latest.expires, new Date());
}

export async function sendPasswordResetLink(
  email: string,
  origin: string,
): Promise<EmailResult> {
  let token: string;
  try {
    token = await createPasswordResetToken(email);
  } catch (error) {
    console.error("Failed to create password reset token:", error);
    return { success: false, error: "Failed to create password reset token" };
  }

  return sendPasswordResetEmail(
    email,
    buildPasswordResetUrl(origin, email, token),
    PASSWORD_RESET_TOKEN_TTL_HOURS,
  );
}

export async function isPasswordResetTokenValid(
  email: string,
  token: string,
): Promise<boolean> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  });
  if (!record || record.identifier !== getPasswordResetIdentifier(email)) {
    return false;
  }

  return !isTokenExpired(record.expires, new Date());
}

export async function resetPasswordWithToken(
  email: string,
  token: string,
  newPassword: string,
): Promise<PasswordResetResult> {
  const hashedToken = hashToken(token);
  const identifier = getPasswordResetIdentifier(email);

  try {
    // Cheap gate so requests with a bad token never pay for a bcrypt hash;
    // the transaction below stays the authoritative check.
    if (!(await isPasswordResetTokenValid(email, token))) {
      return { success: false, error: INVALID_RESET_LINK_MESSAGE };
    }

    const password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    return await prisma.$transaction(async (tx) => {
      const record = await tx.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      if (
        !record ||
        record.identifier !== identifier ||
        isTokenExpired(record.expires, new Date())
      ) {
        return { success: false, error: INVALID_RESET_LINK_MESSAGE };
      }

      // Only the request that actually deletes the token may set the password,
      // so a link cannot be used twice by concurrent requests.
      const { count } = await tx.verificationToken.deleteMany({
        where: { token: hashedToken },
      });
      if (count !== 1) {
        return { success: false, error: INVALID_RESET_LINK_MESSAGE };
      }

      await tx.user.update({ where: { email }, data: { password } });
      return { success: true, error: null };
    });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
