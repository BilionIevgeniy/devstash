import "server-only";

import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@/features/collections/schemas";
import type { OperationResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";

const NOT_FOUND_ERROR = "This collection no longer exists.";

export async function createUserCollection(
  userId: string,
  { name, description }: CreateCollectionInput,
): Promise<OperationResult> {
  await prisma.collection.create({
    data: { userId, name, description },
    select: { id: true },
  });

  return { success: true, error: null };
}

export async function updateUserCollection(
  userId: string,
  collectionId: string,
  { name, description }: UpdateCollectionInput,
): Promise<OperationResult> {
  const { count } = await prisma.collection.updateMany({
    where: { id: collectionId, userId },
    data: { name, description },
  });

  if (count === 0) return { success: false, error: NOT_FOUND_ERROR };
  return { success: true, error: null };
}

// Raw SQL for the same reason as setUserItemFavorite: favoriting is not an edit,
// so `updatedAt` stays, and the collection keeps its place in the lists.
export async function setUserCollectionFavorite(
  userId: string,
  collectionId: string,
  isFavorite: boolean,
): Promise<OperationResult> {
  const favoritedAt = isFavorite ? new Date() : null;
  const count = await prisma.$executeRaw`
    UPDATE "Collection"
    SET "isFavorite" = ${isFavorite}, "favoritedAt" = ${favoritedAt}
    WHERE "id" = ${collectionId} AND "userId" = ${userId}
  `;

  if (count === 0) return { success: false, error: NOT_FOUND_ERROR };
  return { success: true, error: null };
}

// The items stay: only their `ItemCollection` rows go, by the cascade on the
// foreign key.
export async function deleteUserCollection(
  userId: string,
  collectionId: string,
): Promise<OperationResult> {
  const { count } = await prisma.collection.deleteMany({
    where: { id: collectionId, userId },
  });

  if (count === 0) return { success: false, error: NOT_FOUND_ERROR };
  return { success: true, error: null };
}
