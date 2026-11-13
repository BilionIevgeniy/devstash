import "server-only";

import { deleteUserObject } from "@/features/files/services/objects";
import {
  collectionLinks,
  isRecordNotFound,
  tagLinks,
} from "@/features/items/_internal/services/item-writes";
import {
  editableFields,
  editableUpdate,
} from "@/features/items/domain/item-fields";
import { toSearchTags } from "@/features/items/domain/search-text";
import { getItemFileKey } from "@/features/items/_internal/queries";
import { getItemEditState } from "@/features/items/queries";
import type { UpdateItemInput } from "@/features/items/schemas";
import { getUserItemDetail } from "@/features/items/services/item-detail";
import { userCanUseType } from "@/features/items/services/type-access";
import type { ItemDetail } from "@/features/items/types";
import { fail, ok, type OperationResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type UpdateItemResult = OperationResult<ItemDetail>;

// Removes the caller's tags no item uses any more, after an update or delete
// unlinked them. Best effort: the item is already saved, so a failure is only
// logged. A create in another tab that links one of these tags at the same
// moment can lose that link (accepted, see "Known risks" in architecture.md).
async function deleteOrphanTags(userId: string): Promise<void> {
  try {
    await prisma.tag.deleteMany({ where: { userId, items: { none: {} } } });
  } catch (error) {
    await logger.error("Deleting the unused tags of a user failed", {
      error,
      userId,
    });
  }
}

// The owner is part of the where, so an id of someone else's item fails the
// same way as a missing one. Only the fields of the item's type are written;
// fields left out of the input stay as they are; the tags and collections are
// replaced as a whole. Links that stay are not rewritten, so they keep their
// addedAt, and an existing link was checked when it was made.
export async function updateUserItem(
  userId: string,
  itemId: string,
  input: UpdateItemInput,
): Promise<UpdateItemResult> {
  const current = await getItemEditState(userId, itemId);
  if (!current) return fail("itemNotFound");
  // The answer carries signed URLs, so a locked item cannot be saved either.
  if (!(await userCanUseType(userId, current.typeName))) {
    return fail("filesProOnly");
  }

  const update = editableUpdate(current.typeName, input);
  if ("error" in update) {
    return fail(update.error);
  }
  const { tags, collectionIds, ...fields } = update.data;
  const linked = new Set(current.collectionIds);
  const added = collectionIds.filter((id) => !linked.has(id));

  // A delete of the item or a collection can win between the read and here:
  // P2025 below.
  try {
    await prisma.item.update({
      where: { id: itemId, userId },
      data: {
        ...fields,
        tags: { deleteMany: {}, create: tagLinks(userId, tags) },
        searchTags: toSearchTags(tags),
        collections: {
          deleteMany: { collectionId: { notIn: collectionIds } },
          create: collectionLinks(userId, added),
        },
      },
      select: { id: true },
    });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return fail("itemOrCollectionNotFound");
    }
    throw error;
  }
  await deleteOrphanTags(userId);

  const item = await getUserItemDetail(userId, itemId);
  if (!item) return fail("itemNotFound");
  return ok(item);
}

// Replaces only the content, for an accepted AI rewrite of it: the tags,
// collections and other fields stay as they are. Scoped by the owner, and
// limited to the types that have content.
export async function setUserItemContent(
  userId: string,
  itemId: string,
  content: string,
): Promise<UpdateItemResult> {
  const current = await getItemEditState(userId, itemId);
  if (!current) return fail("itemNotFound");
  if (!editableFields(current.typeName).content) {
    return fail("noTextContent");
  }

  try {
    await prisma.item.update({
      where: { id: itemId, userId },
      data: { content },
      select: { id: true },
    });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return fail("itemNotFound");
    }
    throw error;
  }

  const item = await getUserItemDetail(userId, itemId);
  if (!item) return fail("itemNotFound");
  return ok(item);
}

// Raw SQL on purpose: Prisma stamps `updatedAt` on every update, and favoriting
// is not an edit. It is the one way to leave that column alone without reading
// it first; the price is that a renamed column fails only at runtime. The owner
// in the where makes someone else's item look missing.
export async function setUserItemFavorite(
  userId: string,
  itemId: string,
  isFavorite: boolean,
): Promise<OperationResult> {
  const favoritedAt = isFavorite ? new Date() : null;
  const count = await prisma.$executeRaw`
    UPDATE "Item"
    SET "isFavorite" = ${isFavorite}, "favoritedAt" = ${favoritedAt}
    WHERE "id" = ${itemId} AND "userId" = ${userId}
  `;

  if (count === 0) return fail("itemNotFound");
  return ok();
}

// Raw SQL for the same reason as the favorite: pinning is not an edit.
export async function setUserItemPin(
  userId: string,
  itemId: string,
  isPinned: boolean,
): Promise<OperationResult> {
  const count = await prisma.$executeRaw`
    UPDATE "Item"
    SET "isPinned" = ${isPinned}
    WHERE "id" = ${itemId} AND "userId" = ${userId}
  `;

  if (count === 0) return fail("itemNotFound");
  return ok();
}

// Removes the item's object from R2 before the row, so a failure leaves the
// row and the delete can be retried; a missing object counts as deleted.
async function deleteItemFile(
  userId: string,
  itemId: string,
  fileKey: string,
): Promise<OperationResult> {
  try {
    const result = await deleteUserObject(userId, fileKey);
    if (!result.success) {
      // A key outside the owner's prefix was never written by this app.
      await logger.error("An item has a file key outside its owner's prefix", {
        itemId,
        userId,
      });
      return fail("fileDeleteFailed");
    }
    return result;
  } catch (error) {
    await logger.error("Deleting the file of an item failed", {
      error,
      itemId,
      userId,
    });
    return fail("fileDeleteFailed");
  }
}

// As in the update, the owner in the where makes someone else's item look
// missing. Its tag and collection links go with it (onDelete: Cascade).
export async function deleteUserItem(
  userId: string,
  itemId: string,
): Promise<OperationResult> {
  const item = await getItemFileKey(userId, itemId);
  if (!item) return fail("itemNotFound");

  if (item.fileKey) {
    const file = await deleteItemFile(userId, itemId, item.fileKey);
    if (!file.success) return file;
  }

  // A second delete can win between the read and here: P2025 below.
  try {
    await prisma.item.delete({
      where: { id: itemId, userId },
      select: { id: true },
    });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return fail("itemNotFound");
    }
    throw error;
  }
  await deleteOrphanTags(userId);

  return ok();
}
