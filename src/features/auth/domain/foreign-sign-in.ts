// With a session open, Auth.js links an unknown GitHub account to that session's
// user, so a sign-in that resolves to anyone else must not go on. An unlinked
// account resolves to a fresh id, which never equals the session's.
export function isForeignSignIn(
  sessionUserId: string | undefined,
  signedInUserId: string | undefined,
): sessionUserId is string {
  return sessionUserId !== undefined && sessionUserId !== signedInUserId;
}
