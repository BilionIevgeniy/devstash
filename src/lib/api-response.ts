import { ok, type Failure } from "@/lib/action-result";

// The JSON answers of the route handlers (ADR 0021), in the envelope of
// ActionResult: a failure is its code and params (ADR 0022). Every route answers for one user or does not care, so both
// always send `private, no-store`: a shared cache never keeps one.

/** For a route's own Response (a stream, a 204): never kept by a shared cache. */
export const NO_STORE = { "Cache-Control": "private, no-store" } as const;

function withNoStore(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  merged.set("Cache-Control", NO_STORE["Cache-Control"]);
  return merged;
}

export function jsonOk<T>(data: T, init: ResponseInit = {}): Response {
  return Response.json(ok(data), {
    ...init,
    headers: withNoStore(init.headers),
  });
}

export function jsonError(
  failure: Failure,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json(failure, { status, headers: withNoStore(headers) });
}
