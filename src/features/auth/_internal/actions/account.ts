"use server";

import { auth, signOut } from "@/features/auth/nextauth/auth";
import {
  changePasswordSchema,
  deleteAccountSchema,
} from "@/features/auth/schemas";
import {
  changeUserPassword,
  deleteUserAccount,
} from "@/features/auth/services/account";
import type { AuthActionState } from "@/features/auth/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SIGNED_OUT_ERROR = "You need to be signed in";
const SIGN_IN_URL = "/sign-in";
const SUCCESS: AuthActionState = { success: true, data: null, error: null };

interface DeleteAccountInput {
  password?: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function failure(error: string): AuthActionState {
  return { success: false, data: null, error };
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<AuthActionState> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return failure(SIGNED_OUT_ERROR);

  try {
    const result = await changeUserPassword(
      userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    return result.success ? SUCCESS : failure(result.error ?? GENERIC_ERROR);
  } catch (error) {
    console.error("Changing the password failed:", error);
    return failure(GENERIC_ERROR);
  }
}

export async function deleteAccount(
  input: DeleteAccountInput = {},
): Promise<AuthActionState> {
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

  // Redirects to the sign-in page and never returns.
  await signOut({ redirectTo: SIGN_IN_URL });
  return SUCCESS;
}
