import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { getRetryAfterSeconds } from "@/features/auth/domain/rate-limits";
import { parseSearchParams } from "@/features/search/schemas";
import { searchPalette } from "@/features/search/services/search";
import { jsonError, jsonOk, SERVER_ERROR_MESSAGE } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { RateLimitUnavailableError } from "@/lib/rate-limit";

// Not a standard status: the client closed the request and reads no answer.
const CLIENT_CLOSED_REQUEST = 499;

// The command palette's search (ADR 0018): a route, not a Server Action, since
// actions run one at a time and typing needs the latest request to win.
// Answers 401 instead of redirecting to sign-in: the palette calls this with
// fetch and expects JSON back. The request's signal goes down, so a search the
// palette abandoned stops reading.
export async function GET(request: Request) {
  const userId = await getSignedInUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const params = parseSearchParams(new URL(request.url).searchParams);
  if (!params.success) return jsonError("Invalid search", 400);

  try {
    const result = await searchPalette(userId, params.data, request.signal);
    if (result.status === "rate-limited") {
      const retryAfter = getRetryAfterSeconds(result.reset, Date.now());
      return jsonError("Too many searches", 429, {
        "Retry-After": String(retryAfter),
      });
    }
    return jsonOk(result.results);
  } catch (error) {
    if (request.signal.aborted)
      return jsonError("Cancelled", CLIENT_CLOSED_REQUEST);
    if (error instanceof RateLimitUnavailableError) {
      return jsonError("Search is unavailable right now", 503);
    }
    await logger.error("Search failed", { error, userId });
    return jsonError(SERVER_ERROR_MESSAGE, 500);
  }
}
