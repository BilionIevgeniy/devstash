import "client-only";
import { fail, type Failure } from "@/lib/action-result";
import { routeError } from "@/lib/route-error";

export type RegisterResult = { success: true } | Failure;

// The browser side of POST /api/auth/register. The route answers every failure
// with a body that carries the error code; a network failure or a body that
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
    if (response.ok) return { success: true };
    return await routeError(response, "generic");
  } catch {
    return fail("generic");
  }
}
