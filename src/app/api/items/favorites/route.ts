import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { getFavoriteItemPage } from "@/features/items/queries/lists";
import { favoritePageQuerySchema } from "@/features/items/schemas";
import { fail } from "@/lib/action-result";
import { jsonError, jsonOk } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";

// The next page of /favorites (?sort=&cursor=), fetched by the endless list
// in the browser (ADR 0025). A route, not a Server Action: the browser may
// read while an action runs, and actions run one at a time. Answers 401
// instead of redirecting: the list calls this with fetch and expects JSON.
export async function GET(request: Request) {
  const userId = await getSignedInUserId();
  if (!userId) return jsonError(fail("unauthorized"), 401);

  const params = new URL(request.url).searchParams;
  const parsed = favoritePageQuerySchema.safeParse({
    sort: params.get("sort") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
  });
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  try {
    const { sort, after } = parsed.data;
    return jsonOk(await getFavoriteItemPage(userId, sort, after));
  } catch (error) {
    await logger.error("Favorites page failed", { error, userId });
    return jsonError(fail("serverError"), 500);
  }
}
