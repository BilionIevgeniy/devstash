"use server";

import { refresh } from "next/cache";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import {
  createItemSchema,
  deleteItemOptionsSchema,
  itemIdSchema,
  updateItemSchema,
} from "@/features/items/schemas";
import {
  createUserItem,
  deleteUserItem,
  updateUserItem,
} from "@/features/items/services/item";
import type { ItemDetailJson } from "@/features/items/types";
import type { ActionResult } from "@/lib/action-result";

const GENERIC_ERROR = "Something went wrong. Please try again.";

type UpdateItemActionResult = ActionResult<ItemDetailJson | null>;

function failure(error: string): ActionResult<null> {
  return { success: false, data: null, error };
}

export async function createItem(data: unknown): Promise<ActionResult> {
  const parsed = createItemSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await createUserItem(userId, parsed.data);
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    // The new item comes back with this response's fresh page.
    refresh();
    return { success: true, error: null, data: null };
  } catch (error) {
    console.error("Creating the item failed:", error);
    return failure(GENERIC_ERROR);
  }
}

// The detail goes out JSON-safe (see toItemDetailJson).
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

    return { success: true, error: null, data: toItemDetailJson(result.data) };
  } catch (error) {
    console.error("Updating the item failed:", error);
    return failure(GENERIC_ERROR);
  }
}

// `refresh: false` is for a caller that leaves the page itself: refreshing the
// item page of a deleted item would render its 404.
export async function deleteItem(
  itemId: string,
  options?: unknown,
): Promise<ActionResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) return failure(parsedId.error.issues[0].message);

  const parsedOptions = deleteItemOptionsSchema.safeParse(options);
  if (!parsedOptions.success) {
    return failure(parsedOptions.error.issues[0].message);
  }

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await deleteUserItem(userId, parsedId.data);
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    // The fresh page comes back with this response, so the drawer's
    // optimistic removal hands over to it without a flicker.
    if (parsedOptions.data.refresh) refresh();
    return { success: true, error: null, data: null };
  } catch (error) {
    console.error("Deleting the item failed:", error);
    return failure(GENERIC_ERROR);
  }
}
