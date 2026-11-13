export const REAUTH_WINDOW_MS = 10 * 60 * 1000;
export const REAUTH_WRONG_ACCOUNT = "wrong-account";

// With a session open, Auth.js links an unknown GitHub account to that session's
// user, so a sign-in that resolves to anyone else must not go on. An unlinked
// account resolves to a fresh id, which never equals the session's.
export function isForeignSignIn(
  sessionUserId: string | undefined,
  signedInUserId: string | undefined,
): sessionUserId is string {
  return sessionUserId !== undefined && sessionUserId !== signedInUserId;
}

// Accounts without a password cannot prove who they are by typing one, so a
// destructive action needs a sign-in from the last few minutes instead.
export function isRecentlyAuthenticated(
  authenticatedAt: number | undefined,
  now: number,
): boolean {
  return authenticatedAt !== undefined && now - authenticatedAt <= REAUTH_WINDOW_MS;
}

export function requiresReauthentication(
  hasPassword: boolean,
  authenticatedAt: number | undefined,
  now: number,
): boolean {
  return !hasPassword && !isRecentlyAuthenticated(authenticatedAt, now);
}
