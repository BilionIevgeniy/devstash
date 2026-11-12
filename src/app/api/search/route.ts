import { auth } from "@/features/auth/nextauth/auth";
import { getRetryAfterSeconds } from "@/features/auth/domain/rate-limits";
import { parseSearchParams } from "@/features/search/schemas";
import { searchPalette } from "@/features/search/services/search";
import { logger } from "@/lib/logger";
import { RateLimitUnavailableError } from "@/lib/rate-limit";

// A user's own content: never kept by a shared cache.
const NO_STORE = { "Cache-Control": "private, no-store" };
// Not a standard status: the client closed the request and reads no answer.
const CLIENT_CLOSED_REQUEST = 499;

function failure(
  error: string,
  status: number,
  headers: Record<string, string> = {},
) {
  return Response.json(
    { success: false, data: null, error },
    { status, headers: { ...NO_STORE, ...headers } },
  );
}

// The command palette's search (ADR 0018): a route, not a Server Action, since
// actions run one at a time and typing needs the latest request to win.
// Answers 401 instead of redirecting to sign-in: the palette calls this with
// fetch and expects JSON back. The request's signal goes down, so a search the
// palette abandoned stops reading.
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return failure("Unauthorized", 401);

  const params = parseSearchParams(new URL(request.url).searchParams);
  if (!params.success) return failure("Invalid search", 400);

  try {
    const result = await searchPalette(userId, params.data, request.signal);
    if (result.status === "rate-limited") {
      const retryAfter = getRetryAfterSeconds(result.reset, Date.now());
      return failure("Too many searches", 429, {
        "Retry-After": String(retryAfter),
      });
    }
    return Response.json(
      { success: true, data: result.results, error: null },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (request.signal.aborted)
      return failure("Cancelled", CLIENT_CLOSED_REQUEST);
    if (error instanceof RateLimitUnavailableError) {
      return failure("Search is unavailable right now", 503);
    }
    await logger.error("Search failed", { error, userId });
    return failure("Something went wrong", 500);
  }
}
