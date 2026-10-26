export const REAUTH_WINDOW_MS = 10 * 60 * 1000;
export const REAUTH_REQUIRED_MESSAGE =
  "For your security, sign in with GitHub again to confirm";

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
