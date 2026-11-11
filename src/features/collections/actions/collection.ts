"use server";

import { refresh } from "next/cache";

import { getSessionUser } from "@/features/auth/nextauth/session";
import {
  collectionIdSchema,
  createCollectionSchema,
  deleteCollectionOptionsSchema,
  updateCollectionSchema,
} from "@/features/collections/schemas";
import {
  createUserCollection,
  deleteUserCollection,
  setUserCollectionFavorite,
  updateUserCollection,
} from "@/features/collections/services/collection";
import { favoriteValueSchema } from "@/features/items/schemas";
import type { ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";

const GENERIC_ERROR = "Something went wrong. Please try again.";

function failure(error: string): ActionResult<null> {
  return { success: false, data: null, error };
}

export async function createCollection(data: unknown): Promise<ActionResult> {
  const parsed = createCollectionSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await createUserCollection(userId, parsed.data);
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    // The new collection comes back with this response's fresh page.
    refresh();
    return { success: true, error: null, data: null };
  } catch (error) {
    await logger.error("Creating the collection failed", { error, userId });
    return failure(GENERIC_ERROR);
  }
}

export async function updateCollection(
  collectionId: string,
  data: unknown,
): Promise<ActionResult> {
  const parsedId = collectionIdSchema.safeParse(collectionId);
  if (!parsedId.success) return failure(parsedId.error.issues[0].message);

  const parsed = updateCollectionSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await updateUserCollection(
      userId,
      parsedId.data,
      parsed.data,
    );
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    // The new name comes back with this response's fresh page and sidebar.
    refresh();
    return { success: true, error: null, data: null };
  } catch (error) {
    await logger.error("Updating the collection failed", { error, userId });
    return failure(GENERIC_ERROR);
  }
}

// The client sends the value it wants, so two tabs cannot flip it back and forth.
export async function setCollectionFavorite(
  collectionId: string,
  isFavorite: boolean,
): Promise<ActionResult> {
  const parsedId = collectionIdSchema.safeParse(collectionId);
  if (!parsedId.success) return failure(parsedId.error.issues[0].message);

  const parsedValue = favoriteValueSchema.safeParse(isFavorite);
  if (!parsedValue.success) return failure(parsedValue.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await setUserCollectionFavorite(
      userId,
      parsedId.data,
      parsedValue.data,
    );
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    // The star, the sidebar and the favorites come back with this response.
    refresh();
    return { success: true, error: null, data: null };
  } catch (error) {
    await logger.error("Updating the favorite of a collection failed", {
      error,
      userId,
    });
    return failure(GENERIC_ERROR);
  }
}

// `refresh: false` is for a caller that leaves the page itself: refreshing the
// page of a deleted collection would render its 404.
export async function deleteCollection(
  collectionId: string,
  options?: unknown,
): Promise<ActionResult> {
  const parsedId = collectionIdSchema.safeParse(collectionId);
  if (!parsedId.success) return failure(parsedId.error.issues[0].message);

  const parsedOptions = deleteCollectionOptionsSchema.safeParse(options);
  if (!parsedOptions.success) {
    return failure(parsedOptions.error.issues[0].message);
  }

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await deleteUserCollection(userId, parsedId.data);
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    if (parsedOptions.data.refresh) refresh();
    return { success: true, error: null, data: null };
  } catch (error) {
    await logger.error("Deleting the collection failed", { error, userId });
    return failure(GENERIC_ERROR);
  }
}
