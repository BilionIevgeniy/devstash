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
