"use server";

import { z } from "zod";
import { getRequestOrigin } from "@/features/auth/_internal/request-origin";
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
