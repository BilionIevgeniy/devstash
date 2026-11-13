"use server";

import { redirect, RedirectType } from "next/navigation";

import { deleteAccountSchema } from "@/features/account/schemas";
import { deleteAccount as deleteUserAccount } from "@/features/account/_internal/services/delete-account";
import { auth, signOut } from "@/features/auth/nextauth/auth";
import { fail, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";

const HOME_URL = "/";

interface DeleteAccountInput {
  password?: string;
}

// auth() and not getSessionUser(): a signed-out caller gets an error in the
// dialog instead of a redirect.
export async function deleteAccount(
  input: DeleteAccountInput = {},
): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("signedOut");

  try {
    const result = await deleteUserAccount(userId, {
      password: parsed.data.password,
      authenticatedAt: session.user.authenticatedAt,
    });
    if (!result.success) return result;
  } catch (error) {
    await logger.error("Deleting the account failed", { error, userId });
    return fail("generic");
  }

  // Outside the try: redirect() throws, and the catch above would turn that
  // into an error on a deleted account. Replace and not signOut's own redirect,
  // a push in an action: Back must not lead to the settings of a deleted account.
  await signOut({ redirect: false });
  redirect(HOME_URL, RedirectType.replace);
}
