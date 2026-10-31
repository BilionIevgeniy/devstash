import { auth } from "@/features/auth/nextauth/auth";
import { getUserItemDetail } from "@/features/items/services/item-detail";
import { itemIdSchema } from "@/features/items/schemas";

// A user's own content and signed URLs: never kept by a shared cache.
const NO_STORE = { "Cache-Control": "private, no-store" };

function failure(error: string, status: number) {
  return Response.json(
    { success: false, data: null, error },
    { status, headers: NO_STORE },
  );
}

// Answers 401 instead of redirecting to sign-in: the drawer and the cards'
// copy buttons call this with fetch and expect JSON back.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/items/[id]">,
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return failure("Unauthorized", 401);

  const parsed = itemIdSchema.safeParse((await ctx.params).id);
  if (!parsed.success) return failure(parsed.error.issues[0].message, 400);

  try {
    const item = await getUserItemDetail(userId, parsed.data);
    if (!item) return failure("Item not found", 404);
    return Response.json(
      { success: true, data: item, error: null },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("Item detail failed:", error);
    return failure("Something went wrong", 500);
  }
}
