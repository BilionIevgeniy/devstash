// The address a new GitHub user gets: the primary one, and only if GitHub has
// verified it. Auth.js takes the primary (or the first) address unchecked, so
// anyone could sign up with an address they added to GitHub but do not own,
// and the deletion link of that account would go to a stranger.
export function pickVerifiedEmail(emails: unknown): string | null {
  if (!Array.isArray(emails)) return null;
  for (const entry of emails as unknown[]) {
    if (typeof entry !== "object" || entry === null) continue;
    const { email, primary, verified } = entry as Record<string, unknown>;
    if (primary === true && verified === true && typeof email === "string") {
      return email;
    }
  }
  return null;
}
