import {
  emailLinkPath,
  emailLinkUrl,
  tokenExpiry,
} from "@/features/auth/domain/verification-token";

// An account with no password confirms its deletion with a link emailed to its
// address: a GitHub sign-in can finish with no screen, so a recent one no longer
// proves that the owner is at the keyboard.
export const ACCOUNT_DELETION_TOKEN_TTL_HOURS = 1;
export const ACCOUNT_DELETION_PATH = "/settings/delete-account";

const IDENTIFIER_PREFIX = "account-deletion:";

// The tokens share VerificationToken with the verification and reset links, so
// the prefix keeps one kind from replacing or confirming another.
export function getAccountDeletionIdentifier(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

export function getAccountDeletionExpiry(now: Date): Date {
  return tokenExpiry(now, ACCOUNT_DELETION_TOKEN_TTL_HOURS);
}

// The page of the link, with its query: also where the sign-in leads back to
// when the link was opened while another account was signed in.
export function accountDeletionPath(email: string, token: string): string {
  return emailLinkPath(ACCOUNT_DELETION_PATH, email, token);
}

export function buildAccountDeletionUrl(
  origin: string,
  email: string,
  token: string,
): string {
  return emailLinkUrl(origin, ACCOUNT_DELETION_PATH, email, token);
}

export type DeletionLinkState = "valid" | "invalid" | "otherAccount";

// What the page of the link shows. The link's address must be the signed-in
// account's own; an account with a password confirms with it and has no link.
export function deletionLinkState(
  account: { email: string; hasPassword: boolean },
  linkEmail: string,
  isTokenValid: boolean,
): DeletionLinkState {
  if (linkEmail !== account.email) return "otherAccount";
  return !account.hasPassword && isTokenValid ? "valid" : "invalid";
}
