import { localeBodySchema } from "@/features/app-shell/schemas";
import { fail } from "@/lib/action-result";
import { jsonError, NO_STORE } from "@/lib/api-response";
import { setLocaleCookie } from "@/lib/locale-cookie";
import { firstIssue } from "@/lib/validation";

// The language picked on the static homepage, remembered for the auth pages
// and the app (ADR 0024). A route, not a Server Action: an action that sets a
// cookie refreshes the current page, which would race the link's navigation.
// Open to visitors, so no session; it stores nothing but the caller's own
// cookie, so no rate limit.
//
// A route has no built-in origin check, so a foreign page must not be able to
// set the language: JSON only (a cross-site fetch with that type needs a CORS
// preflight this route never answers, and a form cannot send it), and a
// browser that says the request is cross-site is refused. Not compared with
// APP_URL: a preview deployment has an origin of its own.
export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/json")) {
    return jsonError(fail("invalidRequest"), 415);
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") {
    return jsonError(fail("invalidRequest"), 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(fail("invalidRequest"), 400);
  }
  const parsed = localeBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  await setLocaleCookie(parsed.data.locale);
  return new Response(null, { status: 204, headers: NO_STORE });
}
