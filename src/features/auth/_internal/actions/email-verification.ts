"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  sendVerificationLink,
  wasLinkSentRecently,
} from "@/features/auth/email-verification";
import { prisma } from "@/lib/prisma";
import type { AuthActionState } from "@/features/auth/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Invalid email address"));

function failure(error: string): AuthActionState {
  return { success: false, data: null, error };
}

async function getRequestOrigin(): Promise<string | null> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return null;
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

export async function resendVerificationEmail(
  email: string,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data },
      select: { password: true, emailVerified: true },
    });
    if (
      !user?.password ||
      user.emailVerified ||
      (await wasLinkSentRecently(parsed.data))
    ) {
      return { success: true, data: null, error: null };
    }

    const origin = await getRequestOrigin();
    if (!origin) return failure(GENERIC_ERROR);

    const result = await sendVerificationLink(parsed.data, origin);
    if (!result.success) {
      return failure("We couldn't send the email. Please try again later.");
    }
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Resending verification email failed:", error);
    return failure(GENERIC_ERROR);
  }
}
