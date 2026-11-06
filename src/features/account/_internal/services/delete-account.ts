import "server-only";

import {
  deleteVerifiedUserRows,
  verifyAccountDeletion,
  type DeleteAccountProof,
} from "@/features/auth/services/account";
import { deleteBillingCustomer } from "@/features/billing/services/customer";
import { purgeUserObjects } from "@/features/files/services/objects";
import type { OperationResult } from "@/lib/action-result";

const CANCEL_FAILED =
  "Your subscription could not be cancelled, so nothing was removed. Please try again.";
const PURGE_FAILED =
  "Your files could not be deleted, so your account was not removed. Any active subscription has been cancelled. Please try again.";

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
  if (!verification.data) return { success: true, error: null };

  try {
    await deleteBillingCustomer(userId);
  } catch (error) {
    console.error(`Cancelling the billing of user ${userId} failed:`, error);
    return { success: false, error: CANCEL_FAILED };
  }

  try {
    await purgeUserObjects(userId);
  } catch (error) {
    console.error(`Purging the files of user ${userId} failed:`, error);
    return { success: false, error: PURGE_FAILED };
  }

  await deleteVerifiedUserRows(verification.data);

  try {
    await purgeUserObjects(userId);
  } catch (error) {
    console.error(`The second purge for deleted user ${userId} failed:`, error);
  }
  return { success: true, error: null };
}
