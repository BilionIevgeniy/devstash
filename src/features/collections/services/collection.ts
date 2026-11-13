import "server-only";

import {
  FREE_COLLECTION_LIMIT,
  withinFreeCollectionLimit,
} from "@/features/billing/domain/limits";
import { getEntitlements } from "@/features/billing/queries";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@/features/collections/schemas";
import { fail, ok, type OperationResult } from "@/lib/action-result";
import { LOCKED_TRANSACTION, lockForTransaction } from "@/lib/advisory-lock";
import { prisma } from "@/lib/prisma";

const NOT_FOUND_ERROR = "This collection no longer exists.";
const COLLECTION_LIMIT_REACHED = `You have reached the Free plan's limit of ${FREE_COLLECTION_LIMIT} collections. Upgrade to Pro for unlimited collections.`;

// Pro skips the lock and the count. Two parallel creates of a Free user wait
// here, so they cannot both pass the limit.
async function insertCollection(
  isPro: boolean,
  data: CreateCollectionInput & { userId: string },
): Promise<{ id: string } | null> {
  const select = { id: true };
  if (isPro) return prisma.collection.create({ data, select });

  const { userId } = data;
  return prisma.$transaction(async (tx) => {
    await lockForTransaction(tx, `free-collections:${userId}`);
    const count = await tx.collection.count({ where: { userId } });
    if (!withinFreeCollectionLimit(count)) return null;
    return tx.collection.create({ data, select });
  }, LOCKED_TRANSACTION);
}

export type CreateCollectionResult = OperationResult<{ id: string }>;

export async function createUserCollection(
  userId: string,
  { name, description }: CreateCollectionInput,
): Promise<CreateCollectionResult> {
  const { isPro } = await getEntitlements(userId);
  const collection = await insertCollection(isPro, {
    userId,
    name,
    description,
  });

  if (!collection) {
    return fail(COLLECTION_LIMIT_REACHED);
  }
  return ok(collection);
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

  if (count === 0) return fail(NOT_FOUND_ERROR);
  return ok();
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

  if (count === 0) return fail(NOT_FOUND_ERROR);
  return ok();
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

  if (count === 0) return fail(NOT_FOUND_ERROR);
  return ok();
}
