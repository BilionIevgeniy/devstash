import "client-only";
import { GENERIC_ERROR_MESSAGE } from "@/lib/action-result";

export type RegisterResult =
  { success: true } | { success: false; error: string };

interface RegisterResponse {
  success: boolean;
  error: string | null;
}

// The browser side of POST /api/auth/register. The route answers every failure
// with a body that carries the error to show; a network failure or a body that
// is not JSON reads as a generic error.
export async function postRegistration(
  values: Record<string, string>,
): Promise<RegisterResult> {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result: RegisterResponse = await response.json();
    if (result.success) return { success: true };
    return { success: false, error: result.error ?? GENERIC_ERROR_MESSAGE };
  } catch {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}
