import "server-only";

import {
  deleteVerifiedUserRows,
  verifyAccountDeletion,
  type DeleteAccountProof,
} from "@/features/auth/services/account";
import { deleteBillingCustomer } from "@/features/billing/services/customer";
import { purgeUserObjects } from "@/features/files/services/objects";
import { fail, ok, type OperationResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";

// Verify, stop the billing, purge the files, then delete the rows (ADR 0004).
// The billing goes first, so nobody pays for a deleted account. The files go
// before the rows and a failed purge aborts, so no file outlives the rows that
// would let the user delete it. The second purge catches an upload from another tab whose
// signed PUT landed between the first purge and the rows; it is best effort,
// since the account is already gone by then.
export async function deleteAccount(
  userId: string,
  proof: DeleteAccountProof,
): Promise<OperationResult> {
  const verification = await verifyAccountDeletion(userId, proof);
  if (!verification.success) return verification;
  if (!verification.data) return ok();

  try {
    await deleteBillingCustomer(userId);
  } catch (error) {
    await logger.error("Cancelling the billing of a user failed", {
      error,
      userId,
    });
    return fail("subscriptionCancelFailed");
  }

  try {
    await purgeUserObjects(userId);
  } catch (error) {
    await logger.error("Purging the files of a user failed", {
      error,
      userId,
    });
    return fail("filesPurgeFailed");
  }

  await deleteVerifiedUserRows(verification.data);

  try {
    await purgeUserObjects(userId);
  } catch (error) {
    await logger.error("The second purge for a deleted user failed", {
      error,
      userId,
    });
  }
  return ok();
}
