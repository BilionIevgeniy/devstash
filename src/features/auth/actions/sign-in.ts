"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { signIn, signOut } from "@/features/auth/nextauth/auth";
import {
  EMAIL_NOT_VERIFIED_CODE,
  TOO_MANY_ATTEMPTS_CODE,
} from "@/features/auth/_internal/errors";
import {
  getBlockingReset,
  LOGIN_BY_EMAIL_GLOBAL,
  LOGIN_BY_EMAIL_IP,
  LOGIN_BY_IP,
  loginEmailKey,
} from "@/features/auth/domain/rate-limits";
import { tooManyAttemptsParams } from "@/lib/http/retry-after";
import { signInHref } from "@/features/auth/domain/callback-url";
import { callbackPathSchema, signInSchema } from "@/features/auth/schemas";
import type { AuthActionState } from "@/features/auth/types";
import { getClientIp } from "@/lib/http/client-ip";
import {
  getIpRateLimitStatus,
  getRateLimitStatus,
} from "@/lib/vendors/rate-limit";
import {
  fail,
  ok,
  type ActionResult,
  type Failure,
} from "@/lib/errors/action-result";
import { firstIssue } from "@/lib/errors/validation";

// The sign-in error only carries a code, so the time to wait is read from the
// counters; when none can be read the message simply has no time in it.
async function lockoutFailure(email: string): Promise<Failure> {
  const ip = getClientIp(await headers());
  const reset = getBlockingReset(
    await Promise.all([
      getRateLimitStatus(LOGIN_BY_EMAIL_IP, loginEmailKey(email, ip)),
      getRateLimitStatus(LOGIN_BY_EMAIL_GLOBAL, email),
      getIpRateLimitStatus(LOGIN_BY_IP, ip),
    ]),
  );
  return reset === null
    ? fail("tooManyAttemptsNoTime")
    : fail("tooManyAttempts", tooManyAttemptsParams(reset, Date.now()));
}

export async function signInWithCredentials(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const redirectTo = callbackPathSchema.parse(formData.get("callbackUrl"));

  try {
    await signIn("credentials", { ...parsed.data, redirectTo });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      if (error.code === TOO_MANY_ATTEMPTS_CODE) {
        return lockoutFailure(parsed.data.email);
      }
      return fail(
        error.code === EMAIL_NOT_VERIFIED_CODE
          ? "emailNotVerified"
          : "invalidCredentials",
      );
    }
    if (error instanceof AuthError) return fail("serverError");
    throw error;
  }
  return ok();
}

export async function signInWithGitHub(formData: FormData): Promise<void> {
  const redirectTo = callbackPathSchema.parse(formData.get("callbackUrl"));
  await signIn("github", { redirectTo });
}

// Ends the session and leaves the navigation to the browser, which loads the
// homepage of the user's language as a new document (leaveSession, ADR 0037):
// a redirect here would be a soft navigation that keeps the user's hidden
// routes for Back. Deleting the cookie re-renders the current page, which may
// redirect to sign-in on its own; the caller leaves on that too.
export async function signOutUser(): Promise<ActionResult> {
  await signOut({ redirect: false });
  return ok();
}

// Signs out so the user can sign in with another account, then leads to the
// sign-in page, which continues to the form's path. Replace and not signOut's
// own redirect, a push: Back must not lead to a page of the old session. A
// redirect and not leaveSession: /switch-account is reached only by a
// document load (the GitHub callback, an email link), in (auth), so no route
// of the old user is mounted; a soft link to it from the app would need
// leaveSession (ADR 0037).
export async function switchAccount(formData: FormData): Promise<void> {
  const callbackPath = callbackPathSchema.parse(formData.get("callbackUrl"));
  await signOut({ redirect: false });
  redirect(signInHref(callbackPath), RedirectType.replace);
}
