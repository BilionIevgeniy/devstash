import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import {
  CUSTOM_TYPES_MAX,
  freeSlug,
  sameTypeName,
  slugFromName,
} from "@/features/item-types/domain/custom-type";
import type { CustomTypeInput } from "@/features/item-types/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";
import {
  LOCKED_TRANSACTION,
  lockForTransaction,
} from "@/lib/postgres/advisory-lock";
import {
  FOREIGN_KEY_VIOLATION_CODE,
  hasPrismaCode,
} from "@/lib/postgres/prisma-errors";
import { prisma } from "@/lib/postgres/prisma";

export type CreateCustomTypeResult = OperationResult<{
  id: string;
  slug: string;
}>;

interface OwnType {
  id: string;
  name: string;
  slug: string;
}

// Every write of a user's types waits for this lock, so the cap, the name
// check and the free slug are decided on rows no parallel write can change.
async function lockOwnTypes(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<OwnType[]> {
  await lockForTransaction(tx, `custom-types:${userId}`);
  return tx.itemType.findMany({
    where: { userId, isSystem: false },
    select: { id: true, name: true, slug: true },
  });
}

// Pro only, checked here and not only hidden in the interface. The slug is
// made from the name once and never changes (ADR 0031).
export async function createCustomType(
  userId: string,
  input: CustomTypeInput,
): Promise<CreateCustomTypeResult> {
  const { isPro } = await getEntitlements(userId);
  if (!isPro) return fail("customTypesProOnly");

  return prisma.$transaction(async (tx): Promise<CreateCustomTypeResult> => {
    const own = await lockOwnTypes(tx, userId);
    if (own.length >= CUSTOM_TYPES_MAX) {
      return fail("customTypeLimitReached", { limit: CUSTOM_TYPES_MAX });
    }
    if (own.some((type) => sameTypeName(type.name, input.name))) {
      return fail("typeNameTaken");
    }
    const slug = freeSlug(
      slugFromName(input.name),
      own.map((type) => type.slug),
    );
    const type = await tx.itemType.create({
      data: { ...input, slug, userId, isSystem: false },
      select: { id: true, slug: true },
    });
    return ok(type);
  }, LOCKED_TRANSACTION);
}

// A rename changes the name and never the slug, so the URLs of the type and
// its items keep working. Pro only, like the create: a former Pro user keeps
// the types as they are (ADR 0032).
export async function updateCustomType(
  userId: string,
  typeId: string,
  input: CustomTypeInput,
): Promise<OperationResult> {
  const { isPro } = await getEntitlements(userId);
  if (!isPro) return fail("customTypesProOnly");

  return prisma.$transaction(async (tx): Promise<OperationResult> => {
    const own = await lockOwnTypes(tx, userId);
    if (!own.some((type) => type.id === typeId)) return fail("typeNotFound");
    const clash = own.some(
      (type) => type.id !== typeId && sameTypeName(type.name, input.name),
    );
    if (clash) return fail("typeNameTaken");
    await tx.itemType.updateMany({
      where: { id: typeId, userId, isSystem: false },
      data: input,
    });
    return ok();
  }, LOCKED_TRANSACTION);
}

// One statement: a type that still has items is refused by the foreign key of
// Item.typeId (NoAction), so an item created in parallel cannot be orphaned.
// No Pro check: a former Pro user can always clean up.
export async function deleteCustomType(
  userId: string,
  typeId: string,
): Promise<OperationResult> {
  try {
    const { count } = await prisma.itemType.deleteMany({
      where: { id: typeId, userId, isSystem: false },
    });
    return count === 0 ? fail("typeNotFound") : ok();
  } catch (error) {
    if (hasPrismaCode(error, FOREIGN_KEY_VIOLATION_CODE)) {
      return fail("typeHasItems");
    }
    throw error;
  }
}
