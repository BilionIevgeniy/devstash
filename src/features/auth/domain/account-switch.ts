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

// Emails are stored lowercased (emailSchema), and the session holds the one
// the account signed in with.
export function isOtherAccount(
  sessionEmail: string | null | undefined,
  linkEmail: string,
): boolean {
  return Boolean(sessionEmail) && sessionEmail?.toLowerCase() !== linkEmail;
}
