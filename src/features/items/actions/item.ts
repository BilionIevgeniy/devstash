"use server";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { itemIdSchema, updateItemSchema } from "@/features/items/schemas";
import { updateUserItem } from "@/features/items/services/item";
import type { ItemDetailJson } from "@/features/items/types";
import type { ActionResult } from "@/lib/action-result";

const GENERIC_ERROR = "Something went wrong. Please try again.";

type UpdateItemActionResult = ActionResult<ItemDetailJson | null>;

function failure(error: string): UpdateItemActionResult {
  return { success: false, data: null, error };
}

// The dates go out as ISO strings, the shape GET /api/items/[id] answers with,
// so the drawer keeps one type for its detail.
export async function updateItem(
  itemId: string,
  data: unknown,
): Promise<UpdateItemActionResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) return failure(parsedId.error.issues[0].message);

  const parsed = updateItemSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await updateUserItem(userId, parsedId.data, parsed.data);
    if (!result.success || !result.data) {
      return failure(result.error ?? GENERIC_ERROR);
    }

    const { createdAt, updatedAt, ...item } = result.data;
    return {
      success: true,
      error: null,
      data: {
        ...item,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Updating the item failed:", error);
    return failure(GENERIC_ERROR);
  }
}
