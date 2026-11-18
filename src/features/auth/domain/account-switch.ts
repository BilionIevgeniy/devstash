// The page shown when an email link was used, or a GitHub sign-in refused,
// while the browser is signed in with another account: the action is done (or
// was not taken), and the user can sign out to continue as the other account.
export const SWITCH_ACCOUNT_PATH = "/switch-account";

export const ACCOUNT_SWITCH_REASONS = ["password", "email", "github"] as const;
export type AccountSwitchReason = (typeof ACCOUNT_SWITCH_REASONS)[number];

export function isAccountSwitchReason(
  value: unknown,
): value is AccountSwitchReason {
  return ACCOUNT_SWITCH_REASONS.some((reason) => reason === value);
}

export function switchAccountHref(reason: AccountSwitchReason): string {
  return `${SWITCH_ACCOUNT_PATH}?reason=${reason}`;
}

// Whether a signed-in user is someone else than the link's account. Emails
// are stored lowercased (emailSchema), and the session holds the one the
// account signed in with; a session without one cannot be the link's account.
export function isOtherAccount(
  sessionUser: { email?: string | null } | undefined,
  linkEmail: string,
): boolean {
  if (!sessionUser) return false;
  return sessionUser.email?.toLowerCase() !== linkEmail;
}
