import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  demoCollections,
  demoItems,
  demoUser,
  systemItemTypes,
} from "./seed-data";

const BCRYPT_ROUNDS = 12;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: requireEnv("DATABASE_URL") }),
});

async function seedSystemItemTypes() {
  const idsByName = new Map<string, string>();
  for (const type of systemItemTypes) {
    const existing = await prisma.itemType.findFirst({
      where: { name: type.name, isSystem: true, userId: null },
    });
    const record =
      existing ??
      (await prisma.itemType.create({ data: { ...type, isSystem: true } }));
    idsByName.set(type.name, record.id);
  }
  return idsByName;
}

async function seedDemoUser() {
  const password = await bcrypt.hash(
    requireEnv("SEED_DEMO_PASSWORD"),
    BCRYPT_ROUNDS,
  );
  return prisma.user.upsert({
    where: { email: demoUser.email },
    update: {},
    create: { ...demoUser, password, emailVerified: new Date() },
  });
}

// Until Stripe exists, the demo user is the only way to try the Pro features.
async function seedDemoSubscription(userId: string) {
  await prisma.subscription.upsert({
    where: { userId },
    update: { status: "active" },
    create: { userId, status: "active" },
  });
}

async function seedCollections(userId: string) {
  const idsByName = new Map<string, string>();
  for (const collection of demoCollections) {
    const existing = await prisma.collection.findFirst({
      where: { userId, name: collection.name },
    });
    const record =
      existing ??
      (await prisma.collection.create({ data: { ...collection, userId } }));
    idsByName.set(collection.name, record.id);
  }
  return idsByName;
}

async function seedTags(userId: string) {
  const names = new Set(demoItems.flatMap((item) => item.tags));
  const idsByName = new Map<string, string>();
  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name },
    });
    idsByName.set(name, tag.id);
  }
  return idsByName;
}

function getId(ids: Map<string, string>, name: string, kind: string): string {
  const id = ids.get(name);
  if (!id) {
    throw new Error(`Unknown ${kind}: ${name}`);
  }
  return id;
}

async function seedItems(
  userId: string,
  typeIds: Map<string, string>,
  collectionIds: Map<string, string>,
  tagIds: Map<string, string>,
) {
  for (const item of demoItems) {
    const { typeName, collectionNames, tags, ...fields } = item;
    const existing = await prisma.item.findFirst({
      where: { userId, title: item.title },
    });
    const record =
      existing ??
      (await prisma.item.create({
        data: {
          ...fields,
          userId,
          typeId: getId(typeIds, typeName, "item type"),
          tags: {
            create: tags.map((tag) => ({
              tagId: getId(tagIds, tag, "tag"),
            })),
          },
        },
      }));

    await prisma.itemCollection.createMany({
      data: collectionNames.map((name) => ({
        itemId: record.id,
        collectionId: getId(collectionIds, name, "collection"),
      })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  const typeIds = await seedSystemItemTypes();
  const user = await seedDemoUser();
  await seedDemoSubscription(user.id);
  const collectionIds = await seedCollections(user.id);
  const tagIds = await seedTags(user.id);
  await seedItems(user.id, typeIds, collectionIds, tagIds);
  console.log(
    `Seeded ${typeIds.size} system types, demo user ${user.email}, ` +
      `${collectionIds.size} collections, ${demoItems.length} items`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
