import { fail } from "@/lib/errors/action-result";
import { jsonError } from "@/lib/http/api-response";

// The gate of a public route that a page of this app calls with `fetch`
// (`/api/locale`, `/api/vitals`). A route has no built-in origin check, so a
// foreign page must not be able to call it: JSON only (a cross-site fetch with
// that type needs a CORS preflight these routes never answer, and a form
// cannot send it), and a browser that says the request is cross-site is
// refused. Not compared with APP_URL: a preview deployment has an origin of
// its own. The refusal to answer, or null when the request may go on.
export function refuseCrossSiteJson(request: Request): Response | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/json")) {
    return jsonError(fail("invalidRequest"), 415);
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") {
    return jsonError(fail("invalidRequest"), 403);
  }
  return null;
}
