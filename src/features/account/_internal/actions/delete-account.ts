"use server";

import { redirect, RedirectType } from "next/navigation";

import { deleteAccountSchema } from "@/features/account/schemas";
import { deleteAccount as deleteUserAccount } from "@/features/account/_internal/services/delete-account";
import { auth, signOut } from "@/features/auth/nextauth/auth";
import type { ActionResult } from "@/lib/action-result";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SIGNED_OUT_ERROR = "You need to be signed in";
const HOME_URL = "/";

interface DeleteAccountInput {
  password?: string;
}

function failure(error: string): ActionResult {
  return { success: false, data: null, error };
}

// auth() and not getSessionUser(): a signed-out caller gets an error in the
// dialog instead of a redirect.
export async function deleteAccount(
  input: DeleteAccountInput = {},
): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return failure(SIGNED_OUT_ERROR);

  try {
    const result = await deleteUserAccount(userId, {
      password: parsed.data.password,
      authenticatedAt: session.user.authenticatedAt,
    });
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
  } catch (error) {
    console.error("Deleting the account failed:", error);
    return failure(GENERIC_ERROR);
  }

  // Outside the try: redirect() throws, and the catch above would turn that
  // into an error on a deleted account. Replace and not signOut's own redirect,
  // a push in an action: Back must not lead to the settings of a deleted account.
  await signOut({ redirect: false });
  redirect(HOME_URL, RedirectType.replace);
}
