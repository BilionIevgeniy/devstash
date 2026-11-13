import "client-only";

import { isErrorCode, type ErrorCode } from "@/i18n/error-codes";
import { failFrom, type Failure } from "@/lib/action-result";

function isParams(value: unknown): value is Record<string, string | number> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(
      (param) => typeof param === "string" || typeof param === "number",
    )
  );
}

// The failure a route answered as JSON (`{ error: "<code>", params? }`).
// Anything else (the platform's own error page, an empty body, a code this
// build does not know) gets the caller's fallback.
export async function routeError(
  response: Response,
  fallback: ErrorCode,
): Promise<Failure> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      isErrorCode(body.error)
    ) {
      const params =
        "params" in body && isParams(body.params) ? body.params : undefined;
      return failFrom({ error: body.error, params });
    }
  } catch {
    // Not JSON: the fallback.
  }
  return failFrom({ error: fallback });
}
