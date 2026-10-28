"use server";

import { headers } from "next/headers";
import { confirmEmailSchema, emailSchema } from "@/features/auth/schemas";
import {
  confirmEmailAddress,
  resendVerificationLink,
} from "@/features/auth/services/email-verification";
import type { AuthActionState } from "@/features/auth/types";
import { getAppOrigin } from "@/lib/app-url";
import { getClientIp } from "@/lib/client-ip";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SUCCESS: AuthActionState = { success: true, data: null, error: null };

interface ConfirmEmailInput {
  email: string;
  token: string;
  password: string;
}

function failure(error: string): AuthActionState {
  return { success: false, data: null, error };
}

export async function resendVerificationEmail(
  email: string,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  try {
    // Read before any lookup so a missing APP_URL fails the same way for every
    // address and does not reveal which ones have an account.
    const origin = getAppOrigin();

    const result = await resendVerificationLink(
      parsed.data,
      origin,
      getClientIp(await headers()),
    );
    return result.success ? SUCCESS : failure(result.error ?? GENERIC_ERROR);
  } catch (error) {
    console.error("Resending verification email failed:", error);
    return failure(GENERIC_ERROR);
  }
}

export async function confirmEmail(
  input: ConfirmEmailInput,
): Promise<AuthActionState> {
  const parsed = confirmEmailSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const { email, token, password } = parsed.data;

  try {
    const result = await confirmEmailAddress(email, token, password);
    return result.success ? SUCCESS : failure(result.error ?? GENERIC_ERROR);
  } catch (error) {
    console.error("Confirming the email failed:", error);
    return failure(GENERIC_ERROR);
  }
}
