import "server-only";

import {
  deleteVerifiedUserRows,
  type VerifiedDeletion,
} from "@/features/auth/services/account";
import { deleteBillingCustomer } from "@/features/billing/services/customer";
import { purgeUserObjects } from "@/features/files/services/objects";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";
import { logger } from "@/lib/observability/logger";

// Stop the billing, purge the files, then delete the rows (ADR 0004), for an
// account whose deletion `auth` has verified: the user's own delete and the
// daily purge of stale registrations. The billing goes first, so nobody pays
// for a deleted account. The files go before the rows and a failed purge
// aborts, so no file outlives the rows that would let the user delete it. The
// second purge catches an upload from another tab whose signed PUT landed
// between the first purge and the rows; it is best effort, since the account
// is already gone by then. `removed` is false only for a stale registration
// verified in the meantime, whose row stays.
export async function removeVerifiedAccount(
  verified: VerifiedDeletion,
): Promise<OperationResult<{ removed: boolean }>> {
  const { userId } = verified;
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

  const removed = await deleteVerifiedUserRows(verified);
  if (!removed) return ok({ removed });

  try {
    await purgeUserObjects(userId);
  } catch (error) {
    await logger.error("The second purge for a deleted user failed", {
      error,
      userId,
    });
  }
  return ok({ removed });
}
