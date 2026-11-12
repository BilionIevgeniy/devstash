import { auth } from "@/features/auth/nextauth/auth";
import { getRetryAfterSeconds } from "@/features/auth/domain/rate-limits";
import { exportUserData } from "@/features/import-export/services/export";
import { logger } from "@/lib/logger";
import { RateLimitUnavailableError } from "@/lib/rate-limit";

// A user's own content: never kept by a shared cache.
const NO_STORE = { "Cache-Control": "private, no-store" };

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

// The export file (ADR 0019), streamed page by page by the service. Answers
// 401 instead of redirecting: the settings page calls this with fetch.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return failure("Unauthorized", 401);

  try {
    const result = await exportUserData(userId, new Date());
    if (result.status === "forbidden") {
      return failure("Export is a Pro feature", 403);
    }
    if (result.status === "rate-limited") {
      const retryAfter = getRetryAfterSeconds(result.reset, Date.now());
      return failure("You can export once a minute", 429, {
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
      return failure("Export is unavailable right now", 503);
    }
    await logger.error("Export failed", { error, userId });
    return failure("Something went wrong", 500);
  }
}
