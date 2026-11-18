import "server-only";

import { headers } from "next/headers";
import { getToken, type JWT } from "next-auth/jwt";

import { switchAccountHref } from "@/features/auth/domain/account-switch";
import { isForeignSignIn } from "@/features/auth/domain/foreign-sign-in";
import { getSessionVersion } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/domain/auth-paths";

// Says that another account is signed in here and offers to sign out first.
const WRONG_ACCOUNT_URL = switchAccountHref("github");
const REVOKED_SESSION_URL = `${SIGN_IN_PATH}?error=OAuthAccountNotLinked`;

// Reads the raw cookie and not auth(): Auth.js links an account to whatever the
// cookie holds, while auth() answers "no session" once the session is revoked.
// Both cookie names are tried, so a wrong guess about https cannot switch the
// check off without a sound.
async function readSessionCookie(): Promise<JWT | null> {
  const request = { headers: await headers() };
  const secret = process.env.AUTH_SECRET ?? "";
  return (
    (await getToken({ req: request, secret, secureCookie: true })) ??
    (await getToken({ req: request, secret, secureCookie: false }))
  );
}

// Where to send a GitHub sign-in that must not go on, or null when it may.
export async function getForeignSignInRedirect(
  signedInUserId: string | undefined,
): Promise<string | null> {
  const token = await readSessionCookie();
  const sessionUserId = token?.sub;
  if (!isForeignSignIn(sessionUserId, signedInUserId)) return null;

  const currentVersion = await getSessionVersion(sessionUserId);
  // A revoked session has no settings page to come back to.
  return currentVersion === (token?.sv ?? 0)
    ? WRONG_ACCOUNT_URL
    : REVOKED_SESSION_URL;
}
