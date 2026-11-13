"use server";

import { auth, signOut } from "@/features/auth/nextauth/auth";
import { changePasswordSchema } from "@/features/auth/schemas";
import { changeUserPassword } from "@/features/auth/services/account";
import type { AuthActionState } from "@/features/auth/types";
import { logger } from "@/lib/logger";
import { fail, GENERIC_ERROR_MESSAGE, ok } from "@/lib/action-result";
import { firstIssueMessage } from "@/lib/validation";

const SIGN_IN_URL = "/sign-in";
const SIGNED_OUT_ERROR = "You need to be signed in";
const SUCCESS: AuthActionState = ok();

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<AuthActionState> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssueMessage(parsed.error));

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail(SIGNED_OUT_ERROR);

  try {
    const result = await changeUserPassword(
      userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    return result.success ? SUCCESS : fail(result.error);
  } catch (error) {
    await logger.error("Changing the password failed", { error, userId });
    return fail(GENERIC_ERROR_MESSAGE);
  }
}

// Not the homepage, as a plain sign-out: the user signs in again right away
// with the new password.
export async function signOutAfterPasswordChange(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_URL });
}
