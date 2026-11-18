export const NAME_MAX = 100;
// The longest address SMTP can deliver to (RFC 5321 path limit).
export const EMAIL_MAX = 254;

interface ExistingAccount {
  hasPassword: boolean;
  isEmailVerified: boolean;
}

// A repeat registration only sends a fresh link when the account is a
// credentials account still waiting for its email to be verified; for anyone
// else it does nothing, so it reveals nothing.
export function shouldResendVerification(account: ExistingAccount): boolean {
  return account.hasPassword && !account.isEmailVerified;
}

// A registration whose email was never verified is deleted after this many
// days (the daily job, stated in the privacy notice). The link lives 24 hours
// and can be sent again in the meantime.
export const UNVERIFIED_REGISTRATION_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function staleRegistrationCutoff(now: Date): Date {
  return new Date(now.getTime() - UNVERIFIED_REGISTRATION_DAYS * MS_PER_DAY);
}
