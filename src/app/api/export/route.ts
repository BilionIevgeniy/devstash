import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { getRetryAfterSeconds } from "@/features/auth/domain/rate-limits";
import { exportUserData } from "@/features/import-export/services/export";
import { jsonError, NO_STORE, SERVER_ERROR_MESSAGE } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { RateLimitUnavailableError } from "@/lib/rate-limit";

// The export file (ADR 0019), streamed page by page by the service. Answers
// 401 instead of redirecting: the settings page calls this with fetch.
export async function GET() {
  const userId = await getSignedInUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const result = await exportUserData(userId, new Date());
    if (result.status === "forbidden") {
      return jsonError("Export is a Pro feature", 403);
    }
    if (result.status === "rate-limited") {
      const retryAfter = getRetryAfterSeconds(result.reset, Date.now());
      return jsonError("You can export once a minute", 429, {
        "Retry-After": String(retryAfter),
      });
    }
    return new Response(result.stream, {
      headers: {
        ...NO_STORE,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return jsonError("Export is unavailable right now", 503);
    }
    await logger.error("Export failed", { error, userId });
    return jsonError(SERVER_ERROR_MESSAGE, 500);
  }
}
