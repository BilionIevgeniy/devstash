"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import type { AuthActionState } from "@/types/auth";

const DASHBOARD_URL = "/dashboard";
const SIGN_IN_URL = "/sign-in";

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Invalid email address")),
  password: z.string().min(1, "Password is required"),
});

function failure(error: string): AuthActionState {
  return { success: false, data: null, error };
}

export async function signInWithCredentials(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: DASHBOARD_URL });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return failure("Invalid email or password");
    }
    if (error instanceof AuthError) return failure("Something went wrong");
    throw error;
  }
  return { success: true, data: null, error: null };
}

export async function signInWithGitHub(): Promise<void> {
  await signIn("github", { redirectTo: DASHBOARD_URL });
}

export async function signOutUser(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_URL });
}
