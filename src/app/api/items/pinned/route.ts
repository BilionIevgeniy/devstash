import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { getPinnedGroupPage } from "@/features/items/queries/lists";
import { pinnedPageQuerySchema } from "@/features/items/schemas";
import { fail } from "@/lib/action-result";
import { jsonError, jsonOk } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";

// The next page of one group of /pinned (?typeId=&sort=&cursor=), fetched by
// its Show more button (ADR 0025). The read is scoped by the signed-in user,
// so another user's type gives an empty page. Answers 401 instead of
// redirecting: the group calls this with fetch and expects JSON.
export async function GET(request: Request) {
  const userId = await getSignedInUserId();
  if (!userId) return jsonError(fail("unauthorized"), 401);

  const params = new URL(request.url).searchParams;
  const parsed = pinnedPageQuerySchema.safeParse({
    typeId: params.get("typeId") ?? undefined,
    sort: params.get("sort") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
  });
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  try {
    const { typeId, sort, after } = parsed.data;
    return jsonOk(await getPinnedGroupPage(userId, typeId, sort, after));
  } catch (error) {
    await logger.error("Pinned group page failed", { error, userId });
    return jsonError(fail("serverError"), 500);
  }
}
