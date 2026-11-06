import "server-only";

import { headers } from "next/headers";
import { getToken, type JWT } from "next-auth/jwt";

import {
  isForeignSignIn,
  REAUTH_WRONG_ACCOUNT,
} from "@/features/auth/domain/reauth";
import { getSessionVersion } from "@/features/auth/queries";

const WRONG_ACCOUNT_URL = `/settings?reauth=${REAUTH_WRONG_ACCOUNT}`;
const REVOKED_SESSION_URL = "/sign-in?error=OAuthAccountNotLinked";

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
