import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import type { EmailResult, VerifyEmailResult } from "@/types/email";

export const VERIFICATION_TOKEN_TTL_HOURS = 24;
export const INVALID_LINK_ERROR =
  "This verification link is invalid or has expired";

const TOKEN_BYTES = 32;
const MS_PER_HOUR = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function createVerificationToken(email: string): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * MS_PER_HOUR);

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

  const sentAt =
    latest.expires.getTime() - VERIFICATION_TOKEN_TTL_HOURS * MS_PER_HOUR;
  return Date.now() - sentAt < RESEND_COOLDOWN_MS;
}

function buildVerificationUrl(origin: string, email: string, token: string) {
  const url = new URL("/verify-email", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
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

    if (record.expires < new Date()) {
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
