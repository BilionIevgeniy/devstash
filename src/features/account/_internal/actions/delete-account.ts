"use server";

import { getLocale } from "next-intl/server";

import { deleteAccountSchema } from "@/features/account/schemas";
import { deleteAccount as deleteUserAccount } from "@/features/account/_internal/services/delete-account";
import { signOut } from "@/features/auth/nextauth/auth";
import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { sendAccountDeletionLink } from "@/features/auth/services/account-deletion-link";
import { fail, ok, type ActionResult } from "@/lib/errors/action-result";
import { getAppOrigin } from "@/lib/http/app-url";
import { logger } from "@/lib/observability/logger";
import { firstIssue } from "@/lib/errors/validation";

interface DeleteAccountInput {
  password?: string;
  /** The token of the emailed deletion link, for an account with no password. */
  token?: string;
}

// getSignedInUserId and not getSessionUser(): a signed-out caller gets an
// error in the dialog instead of a redirect.
export async function deleteAccount(
  input: DeleteAccountInput = {},
): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  const userId = await getSignedInUserId();
  if (!userId) return fail("signedOut");

  try {
    const result = await deleteUserAccount(userId, {
      password: parsed.data.password,
      deletionToken: parsed.data.token,
    });
    if (!result.success) return result;
  } catch (error) {
    await logger.error("Deleting the account failed", { error, userId });
    return fail("generic");
  }

  // The browser then loads the homepage as a new document (leaveSession in
  // useDeleteAccount, ADR 0037): a redirect would be a soft navigation that
  // keeps the settings of a deleted account mounted for Back.
  await signOut({ redirect: false });
  return ok();
}

// Emails the link that confirms deleting an account with no password, to the
// account's own address.
export async function requestAccountDeletionLink(): Promise<ActionResult> {
  const userId = await getSignedInUserId();
  if (!userId) return fail("signedOut");

  try {
    return await sendAccountDeletionLink(
      userId,
      getAppOrigin(),
      await getLocale(),
    );
  } catch (error) {
    await logger.error("Sending the deletion link failed", { error, userId });
    return fail("generic");
  }
}
