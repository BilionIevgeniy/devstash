import "server-only";

import { removeVerifiedAccount } from "@/features/account/_internal/services/remove-account";
import {
  verifyAccountDeletion,
  type DeleteAccountProof,
} from "@/features/auth/services/account";
import { ok, type OperationResult } from "@/lib/errors/action-result";

// The user's own delete: verify the proof, then remove the account.
export async function deleteAccount(
  userId: string,
  proof: DeleteAccountProof,
): Promise<OperationResult> {
  const verification = await verifyAccountDeletion(userId, proof);
  if (!verification.success) return verification;
  if (!verification.data) return ok();

  return removeVerifiedAccount(verification.data);
}
