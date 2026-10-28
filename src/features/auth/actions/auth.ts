"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/features/auth/auth";
import {
  EMAIL_NOT_VERIFIED_CODE,
  TOO_MANY_ATTEMPTS_CODE,
} from "@/features/auth/_internal/errors";
import { EMAIL_NOT_VERIFIED_MESSAGE } from "@/features/auth/_internal/messages";
import {
  getBlockingReset,
  getTooManyAttemptsMessage,
  LOGIN_BY_EMAIL,
  LOGIN_BY_IP,
  TOO_MANY_ATTEMPTS_MESSAGE,
} from "@/features/auth/domain/rate-limits";
import { signInSchema } from "@/features/auth/schemas";
import type { AuthActionState } from "@/features/auth/types";
import { getClientIp } from "@/lib/client-ip";
import { getIpRateLimitStatus, getRateLimitStatus } from "@/lib/rate-limit";

const DASHBOARD_URL = "/dashboard";
const SIGN_IN_URL = "/sign-in";
const PROFILE_URL = "/profile";
const CREDENTIALS_ERROR_MESSAGES = new Map([
  [EMAIL_NOT_VERIFIED_CODE, EMAIL_NOT_VERIFIED_MESSAGE],
]);

function failure(error: string): AuthActionState {
  return { success: false, data: null, error };
}

// The sign-in error only carries a code, so the time to wait is read from the
// counters; when none can be read the message simply has no time in it.
async function getLockoutMessage(email: string): Promise<string> {
  const reset = getBlockingReset(
    await Promise.all([
      getRateLimitStatus(LOGIN_BY_EMAIL, email),
      getIpRateLimitStatus(LOGIN_BY_IP, getClientIp(await headers())),
    ]),
  );
  return reset === null
    ? TOO_MANY_ATTEMPTS_MESSAGE
    : getTooManyAttemptsMessage(reset, Date.now());
}

export async function signInWithCredentials(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: DASHBOARD_URL });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      if (error.code === TOO_MANY_ATTEMPTS_CODE) {
        return failure(await getLockoutMessage(parsed.data.email));
      }
      return failure(
        CREDENTIALS_ERROR_MESSAGES.get(error.code) ??
          "Invalid email or password",
      );
    }
    if (error instanceof AuthError) return failure("Something went wrong");
    throw error;
  }
  return { success: true, data: null, error: null };
}

export async function signInWithGitHub(): Promise<void> {
  await signIn("github", { redirectTo: DASHBOARD_URL });
}

// A fresh GitHub sign-in confirms the owner before a destructive action on an
// account that has no password to type.
export async function reauthenticateWithGitHub(): Promise<void> {
  await signIn("github", { redirectTo: PROFILE_URL });
}

export async function signOutUser(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_URL });
}
