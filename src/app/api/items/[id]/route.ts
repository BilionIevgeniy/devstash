import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { openUserItem } from "@/features/items/services/item-detail";
import { itemIdSchema } from "@/features/items/schemas";
import { jsonError, jsonOk, SERVER_ERROR_MESSAGE } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { firstIssueMessage } from "@/lib/validation";

// Answers 401 instead of redirecting to sign-in: the drawer and the cards'
// copy buttons call this with fetch and expect JSON back.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/items/[id]">,
) {
  const userId = await getSignedInUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const parsed = itemIdSchema.safeParse((await ctx.params).id);
  if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

  try {
    const result = await openUserItem(userId, parsed.data);
    if (result.status === "missing") return jsonError("Item not found", 404);
    if (result.status === "locked") {
      return jsonError("Renew your subscription to open this item", 403);
    }
    return jsonOk({ item: result.item, canUseAi: result.canUseAi });
  } catch (error) {
    await logger.error("Item detail failed", { error, userId });
    return jsonError(SERVER_ERROR_MESSAGE, 500);
  }
}
