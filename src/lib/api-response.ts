import { fail, ok } from "@/lib/action-result";

// The JSON answers of the route handlers (ADR 0021), in the envelope of
// ActionResult. Every route answers for one user or does not care, so both
// always send `private, no-store`: a shared cache never keeps one.

/** For a route's own Response (a stream, a 204): never kept by a shared cache. */
export const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/** The 500 text of a route: the browser shows its own words for it. */
export const SERVER_ERROR_MESSAGE = "Something went wrong";

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
  error: string,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json(fail(error), { status, headers: withNoStore(headers) });
}
