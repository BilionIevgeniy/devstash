import { localeBodySchema } from "@/features/app-shell/schemas";
import { fail } from "@/lib/errors/action-result";
import { jsonError, NO_STORE } from "@/lib/http/api-response";
import { refuseCrossSiteJson } from "@/lib/http/same-origin-json";
import { setLocaleCookie } from "@/lib/locale/locale-cookie";
import { firstIssue } from "@/lib/errors/validation";

// The language picked on the static homepage, remembered for the auth pages
// and the app (ADR 0024). A route, not a Server Action: an action that sets a
// cookie refreshes the current page, which would race the link's navigation.
// Open to visitors, so no session; it stores nothing but the caller's own
// cookie, so no rate limit. A foreign page must not be able to set the
// language: `refuseCrossSiteJson`.
export async function POST(request: Request): Promise<Response> {
  const refused = refuseCrossSiteJson(request);
  if (refused) return refused;

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
