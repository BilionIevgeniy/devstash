import { getSignedInUserId } from "@/features/auth/nextauth/session";
import { openUserItem } from "@/features/items/services/item-detail";
import { itemIdSchema } from "@/features/items/schemas";
import { fail } from "@/lib/action-result";
import { jsonError, jsonOk } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";

// Answers 401 instead of redirecting to sign-in: the drawer and the cards'
// copy buttons call this with fetch and expect JSON back.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/items/[id]">,
) {
  const userId = await getSignedInUserId();
  if (!userId) return jsonError(fail("unauthorized"), 401);

  const parsed = itemIdSchema.safeParse((await ctx.params).id);
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  try {
    const result = await openUserItem(userId, parsed.data);
    if (result.status === "missing")
      return jsonError(fail("itemNotFound"), 404);
    if (result.status === "locked") {
      return jsonError(fail("itemLocked"), 403);
    }
    return jsonOk({ item: result.item, canUseAi: result.canUseAi });
  } catch (error) {
    await logger.error("Item detail failed", { error, userId });
    return jsonError(fail("serverError"), 500);
  }
}
