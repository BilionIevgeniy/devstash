import "client-only";

import { isErrorCode, type ErrorCode } from "@/i18n/error-codes";
import { failFrom, type ActionResult, type Failure } from "@/lib/action-result";

function isParams(value: unknown): value is Record<string, string | number> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(
      (param) => typeof param === "string" || typeof param === "number",
    )
  );
}

// A failed answer of one of our routes, thrown by a browser helper whose
// caller is a Query: the status tells the retry rule a refusal (4xx, never
// retried) from a failure (5xx, retried once), and `failure` holds the code
// to show (`createQueryClient` in components/common/query-client.ts).
export class RouteError extends Error {
  readonly status: number;
  readonly failure: Failure;

  constructor(status: number, failure: Failure) {
    super(`Route answered ${status}`);
    this.name = "RouteError";
    this.status = status;
    this.failure = failure;
  }
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

// The data of one of our routes' JSON answers (`jsonOk`), or a RouteError for
// anything else: a refusal or failure with its code, a body that says it
// failed, a platform error page (the generic code). For the browser helpers a
// Query calls, so its retry rule can read the status.
export async function readRouteData<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new RouteError(
      response.status,
      await routeError(response, "generic"),
    );
  }
  const body = (await response.json()) as ActionResult<T>;
  if (!body.success) throw new RouteError(response.status, body);
  return body.data;
}
