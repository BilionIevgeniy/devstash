import { getAccountDeletionIdentifier } from "@/features/auth/domain/account-deletion";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";

// Every identifier a token of the address can have in VerificationToken: the
// verification link (the bare address), the reset link and the deletion link.
export function addressTokenIdentifiers(email: string): string[] {
  return [
    email,
    getPasswordResetIdentifier(email),
    getAccountDeletionIdentifier(email),
  ];
}
