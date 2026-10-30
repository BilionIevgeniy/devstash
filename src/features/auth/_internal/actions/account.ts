"use server";

import { auth } from "@/features/auth/nextauth/auth";
import { changePasswordSchema } from "@/features/auth/schemas";
import { changeUserPassword } from "@/features/auth/services/account";
import type { AuthActionState } from "@/features/auth/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SIGNED_OUT_ERROR = "You need to be signed in";
const SUCCESS: AuthActionState = { success: true, data: null, error: null };

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
