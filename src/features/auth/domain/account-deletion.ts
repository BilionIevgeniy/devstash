// An account with no password confirms its deletion with a link emailed to its
// address: a GitHub sign-in can finish with no screen, so a recent one no longer
// proves that the owner is at the keyboard.
export const ACCOUNT_DELETION_TOKEN_TTL_HOURS = 1;
export const ACCOUNT_DELETION_PATH = "/settings/delete-account";

const IDENTIFIER_PREFIX = "account-deletion:";
const MS_PER_HOUR = 60 * 60 * 1000;

// The tokens share VerificationToken with the verification and reset links, so
// the prefix keeps one kind from replacing or confirming another.
export function getAccountDeletionIdentifier(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

export function getAccountDeletionExpiry(now: Date): Date {
  return new Date(
    now.getTime() + ACCOUNT_DELETION_TOKEN_TTL_HOURS * MS_PER_HOUR,
  );
}

// The page of the link, with its query: also where the sign-in leads back to
// when the link was opened while another account was signed in.
export function accountDeletionPath(email: string, token: string): string {
  const query = new URLSearchParams({ token, email });
  return `${ACCOUNT_DELETION_PATH}?${query.toString()}`;
}

export function buildAccountDeletionUrl(
  origin: string,
  email: string,
  token: string,
): string {
  return new URL(accountDeletionPath(email, token), origin).toString();
}
