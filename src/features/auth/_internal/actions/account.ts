"use server";

import { signOut } from "@/features/auth/nextauth/auth";
import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { changePasswordSchema } from "@/features/auth/schemas";
import { changeUserPassword } from "@/features/auth/services/account";
import type { AuthActionState } from "@/features/auth/types";
import { logger } from "@/lib/logger";
import { fail, ok } from "@/lib/action-result";
import { firstIssue } from "@/lib/validation";

const SIGN_IN_URL = "/sign-in";
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
  if (!parsed.success) return firstIssue(parsed.error);

  const userId = await getSignedInUserId();
  if (!userId) return fail("signedOut");

  try {
    const result = await changeUserPassword(
      userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    return result.success ? SUCCESS : result;
  } catch (error) {
    await logger.error("Changing the password failed", { error, userId });
    return fail("generic");
  }
}

// Not the homepage, as a plain sign-out: the user signs in again right away
// with the new password.
export async function signOutAfterPasswordChange(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_URL });
}
