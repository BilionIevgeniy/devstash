"use server";

import { refresh } from "next/cache";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import {
  createItemSchema,
  deleteItemOptionsSchema,
  favoriteValueSchema,
  itemContentSchema,
  itemIdSchema,
  pinValueSchema,
  updateItemSchema,
} from "@/features/items/schemas";
import { createUserItem } from "@/features/items/services/create-item";
import {
  deleteUserItem,
  setUserItemContent,
  setUserItemFavorite,
  setUserItemPin,
  updateUserItem,
} from "@/features/items/services/item";
import type { ItemDetailJson } from "@/features/items/types";
import {
  fail,
  GENERIC_ERROR_MESSAGE,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { firstIssueMessage } from "@/lib/validation";

type UpdateItemActionResult = ActionResult<ItemDetailJson>;

export async function createItem(data: unknown): Promise<ActionResult> {
  const parsed = createItemSchema.safeParse(data);
  if (!parsed.success) return fail(firstIssueMessage(parsed.error));

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await createUserItem(userId, parsed.data);
    if (!result.success) return fail(result.error);
    // The new item comes back with this response's fresh page.
    refresh();
    return ok();
  } catch (error) {
    await logger.error("Creating the item failed", { error, userId });
    return fail(GENERIC_ERROR_MESSAGE);
  }
}

// The detail goes out JSON-safe (see toItemDetailJson).
export async function updateItem(
  itemId: string,
  data: unknown,
): Promise<UpdateItemActionResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) return fail(firstIssueMessage(parsedId.error));

  const parsed = updateItemSchema.safeParse(data);
  if (!parsed.success) return fail(firstIssueMessage(parsed.error));

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await updateUserItem(userId, parsedId.data, parsed.data);
    if (!result.success) return fail(result.error);

    // The fresh page comes back with this response, so the cards behind the
    // form update in the same commit that closes it.
    refresh();
    return ok(toItemDetailJson(result.data));
  } catch (error) {
    await logger.error("Updating the item failed", { error, userId });
    return fail(GENERIC_ERROR_MESSAGE);
  }
}

// Only the content, as the read view's AI rewrite saves it. The detail goes
// out JSON-safe, like updateItem's.
export async function replaceItemContent(
  itemId: string,
  content: unknown,
): Promise<UpdateItemActionResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) return fail(firstIssueMessage(parsedId.error));

  const parsed = itemContentSchema.safeParse(content);
  if (!parsed.success) return fail(firstIssueMessage(parsed.error));

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await setUserItemContent(userId, parsedId.data, parsed.data);
    if (!result.success) return fail(result.error);

    refresh();
    return ok(toItemDetailJson(result.data));
  } catch (error) {
    await logger.error("Replacing the content of an item failed", {
      error,
      userId,
    });
    return fail(GENERIC_ERROR_MESSAGE);
  }
}

// The client sends the value it wants, so two tabs cannot flip it back and forth.
export async function setItemFavorite(
  itemId: string,
  isFavorite: boolean,
): Promise<ActionResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) return fail(firstIssueMessage(parsedId.error));

  const parsedValue = favoriteValueSchema.safeParse(isFavorite);
  if (!parsedValue.success) return fail(firstIssueMessage(parsedValue.error));

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await setUserItemFavorite(
      userId,
      parsedId.data,
      parsedValue.data,
    );
    if (!result.success) return fail(result.error);
    // The fresh page comes back with this response, so the optimistic star
    // hands over to it without a flicker.
    refresh();
    return ok();
  } catch (error) {
    await logger.error("Updating the favorite of an item failed", {
      error,
      userId,
    });
    return fail(GENERIC_ERROR_MESSAGE);
  }
}

// Takes the wanted value, like the favorite, so two tabs cannot flip it back
// and forth.
export async function toggleItemPin(
  itemId: string,
  isPinned: boolean,
): Promise<ActionResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) return fail(firstIssueMessage(parsedId.error));

  const parsedValue = pinValueSchema.safeParse(isPinned);
  if (!parsedValue.success) return fail(firstIssueMessage(parsedValue.error));

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await setUserItemPin(
      userId,
      parsedId.data,
      parsedValue.data,
    );
    if (!result.success) return fail(result.error);
    // The fresh page comes back with this response, so the optimistic pin
    // hands over to it without a flicker.
    refresh();
    return ok();
  } catch (error) {
    await logger.error("Updating the pin of an item failed", { error, userId });
    return fail(GENERIC_ERROR_MESSAGE);
  }
}

// `refresh: false` is for a caller that leaves the page itself: refreshing the
// item page of a deleted item would render its 404.
export async function deleteItem(
  itemId: string,
  options?: unknown,
): Promise<ActionResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) return fail(firstIssueMessage(parsedId.error));

  const parsedOptions = deleteItemOptionsSchema.safeParse(options);
  if (!parsedOptions.success) {
    return fail(firstIssueMessage(parsedOptions.error));
  }

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await deleteUserItem(userId, parsedId.data);
    if (!result.success) return fail(result.error);
    // The fresh page comes back with this response, so the drawer's
    // optimistic removal hands over to it without a flicker.
    if (parsedOptions.data.refresh) refresh();
    return ok();
  } catch (error) {
    await logger.error("Deleting the item failed", { error, userId });
    return fail(GENERIC_ERROR_MESSAGE);
  }
}
