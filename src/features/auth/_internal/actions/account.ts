"use server";

import { signOut } from "@/features/auth/nextauth/auth";
import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { changePasswordSchema } from "@/features/auth/schemas";
import { changeUserPassword } from "@/features/auth/services/account";
import type { AuthActionState } from "@/features/auth/types";
import { logger } from "@/lib/observability/logger";
import { fail, ok, type ActionResult } from "@/lib/errors/action-result";
import { firstIssue } from "@/lib/errors/validation";

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
// with the new password, and the sign-in page says that it changed. No session
// check: signing out is all it does, harmless for a caller with no session, and
// Next refuses a Server Action from another origin.
// The browser then loads the sign-in page as a new document (leaveSession in
// ChangePasswordForm, ADR 0037).
export async function signOutAfterPasswordChange(): Promise<ActionResult> {
  await signOut({ redirect: false });
  return ok();
}
