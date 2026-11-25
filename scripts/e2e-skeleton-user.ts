import type { PrismaClient } from "../src/generated/prisma/client";
import { makePro, writeSnippets } from "./e2e-rows";
import { createVerifiedTestUser } from "./test-database";

// The user of the loading states (e2e/skeletons.spec.ts): as many rows as the
// skeletons draw (six cards, six files, six collections, two pins), the cards with
// the description and the tags of a typical item, since a card without them is
// shorter. Nothing writes to it. Directly and not through the services, like
// the other users of the suite.
export const SKELETON_COLLECTION = "Hooks";
export const SKELETON_SNIPPET = "Skeleton snippet 01";
export const SKELETON_NOTE = "Skeleton note";
export const SKELETON_FILE = "Skeleton file 1";
export const SKELETON_IMAGE = "Skeleton image 1";

const ROWS = 6;
const PINS = 2;
const FAVORITE_COLLECTIONS = 3;
const START = Date.UTC(2025, 2, 3, 9, 0);
const HOUR_MS = 60 * 60 * 1000;
const at = (index: number) => new Date(START + index * HOUR_MS);

async function systemTypeId(
  prisma: PrismaClient,
  name: string,
): Promise<string> {
  const type = await prisma.itemType.findFirstOrThrow({
    where: { name, isSystem: true },
    select: { id: true },
  });
  return type.id;
}

// Six uploads with keys of objects the R2 stand-in does not have: a page only
// signs their URLs.
export async function writeUploads(
  prisma: PrismaClient,
  userId: string,
  type: "file" | "image",
): Promise<void> {
  const extension = type === "file" ? "txt" : "png";
  const typeId = await systemTypeId(prisma, type);
  await prisma.item.createMany({
    data: Array.from({ length: ROWS }, (_, index) => ({
      userId,
      typeId,
      contentType: "FILE",
      title: `Skeleton ${type} ${index + 1}`,
      fileKey: `users/${userId}/skeleton-${type}-${index}.${extension}`,
      fileName: `skeleton-${index + 1}.${extension}`,
      fileSize: 2048,
      createdAt: at(index),
    })),
  });
}

async function writeCollections(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.collection.createMany({
    data: Array.from({ length: ROWS }, (_, index) => {
      const isFavorite = index < FAVORITE_COLLECTIONS;
      return {
        userId,
        name: index === 0 ? SKELETON_COLLECTION : `Collection ${index + 1}`,
        description: "What a collection holds.",
        isFavorite,
        favoritedAt: isFavorite ? at(index) : null,
        createdAt: at(index),
      };
    }),
  });
}

// Every item of the user gets the same two tags, and the snippets go into the
// first collection.
async function linkItems(prisma: PrismaClient, userId: string): Promise<void> {
  const items = await prisma.item.findMany({
    where: { userId },
    select: { id: true, type: { select: { name: true } } },
  });
  for (const name of ["react", "hooks"]) {
    await prisma.tag.create({
      data: {
        userId,
        name,
        items: { create: items.map(({ id }) => ({ itemId: id })) },
      },
    });
  }
  const collection = await prisma.collection.findFirstOrThrow({
    where: { userId, name: SKELETON_COLLECTION },
    select: { id: true },
  });
  await prisma.itemCollection.createMany({
    data: items
      .filter(({ type }) => type.name === "snippet")
      .map(({ id }) => ({ itemId: id, collectionId: collection.id })),
  });
}

// What the sidebar's skeleton draws: one group of five collections and one of
// four items, for a fresh user of a test (scripts/e2e-fixture.ts).
const SIDEBAR_COLLECTIONS = 5;
const SIDEBAR_PINS = 4;

export async function writeSidebarRows(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.collection.createMany({
    data: Array.from({ length: SIDEBAR_COLLECTIONS }, (_, index) => ({
      userId,
      name: `Collection ${index + 1}`,
    })),
  });
  await writeSnippets(prisma, userId, SIDEBAR_PINS, "Pinned", () => ({
    isPinned: true,
  }));
}

export async function seedSkeletonUser(
  prisma: PrismaClient,
  email: string,
  passwordHash: string,
): Promise<void> {
  const userId = await createVerifiedTestUser(prisma, { email, passwordHash });
  // The date of the profile's last line, as long as the skeleton's.
  await prisma.user.update({
    where: { id: userId },
    data: { createdAt: new Date(Date.UTC(2025, 10, 20)) },
  });
  await makePro(prisma, userId);
  await writeUploads(prisma, userId, "file");
  await writeUploads(prisma, userId, "image");
  // The newest, so the dashboard's recent items start with them.
  await writeSnippets(prisma, userId, ROWS, "Skeleton snippet", (index) => ({
    description: "What the snippet is for.",
    language: "typescript",
    isFavorite: true,
    favoritedAt: at(index),
    isPinned: index < PINS,
    createdAt: at(ROWS + index),
  }));
  await prisma.item.create({
    data: {
      userId,
      typeId: await systemTypeId(prisma, "note"),
      contentType: "TEXT",
      title: SKELETON_NOTE,
      content: "A note of one line.",
      createdAt: at(0),
    },
  });
  await writeCollections(prisma, userId);
  await linkItems(prisma, userId);
}
