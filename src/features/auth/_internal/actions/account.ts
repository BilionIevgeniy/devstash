"use server";

import { z } from "zod";
import { changeUserPassword, deleteUserAccount } from "@/features/auth/account";
import { auth, signOut } from "@/features/auth/auth";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import type { AuthActionState } from "@/features/auth/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SIGNED_OUT_ERROR = "You need to be signed in";
const SIGN_IN_URL = "/sign-in";
const SUCCESS: AuthActionState = { success: true, data: null, error: null };

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      )
      .max(
        MAX_PASSWORD_LENGTH,
        `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function failure(error: string): AuthActionState {
  return { success: false, data: null, error };
}

async function getSignedInUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<AuthActionState> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  const userId = await getSignedInUserId();
  if (!userId) return failure(SIGNED_OUT_ERROR);

  try {
    const result = await changeUserPassword(
      userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    return SUCCESS;
  } catch (error) {
    console.error("Changing the password failed:", error);
    return failure(GENERIC_ERROR);
  }
}

export async function deleteAccount(): Promise<AuthActionState> {
  const userId = await getSignedInUserId();
  if (!userId) return failure(SIGNED_OUT_ERROR);

  try {
    await deleteUserAccount(userId);
  } catch (error) {
    console.error("Deleting the account failed:", error);
    return failure(GENERIC_ERROR);
  }

  // Redirects to the sign-in page and never returns.
  await signOut({ redirectTo: SIGN_IN_URL });
  return SUCCESS;
}
