import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { isDevDatabase } from "../scripts/require-dev-database";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  demoCollections,
  demoItems,
  demoProUser,
  demoUser,
  systemItemTypes,
} from "./seed-data";
import { paginationCollections, paginationItems } from "./seed-pagination-data";

// .env holds the secrets and is closed to Claude Code; .env.demo holds only
// the demo password, which the ui-reviewer agent needs to sign in.
config({ path: [".env", ".env.demo"] });

const BCRYPT_ROUNDS = 12;
const collections = [...demoCollections, ...paginationCollections];
const items = [...demoItems, ...paginationItems];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

const connectionString = requireEnv("DATABASE_URL");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
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

async function seedUser(profile: { email: string; name: string }) {
  const password = await bcrypt.hash(
    requireEnv("SEED_DEMO_PASSWORD"),
    BCRYPT_ROUNDS,
  );
  return prisma.user.upsert({
    where: { email: profile.email },
    update: {},
    create: { ...profile, password, emailVerified: new Date() },
  });
}

async function seedCollections(userId: string) {
  const idsByName = new Map<string, string>();
  for (const collection of collections) {
    const existing = await prisma.collection.findFirst({
      where: { userId, name: collection.name },
    });
    const record =
      existing ??
      (await prisma.collection.create({
        data: {
          ...collection,
          favoritedAt: collection.isFavorite ? new Date() : null,
          userId,
        },
      }));
    idsByName.set(collection.name, record.id);
  }
  return idsByName;
}

async function seedTags(userId: string) {
  const names = new Set(items.flatMap((item) => item.tags));
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
  for (const item of items) {
    const { typeName, collectionNames, tags, ...fields } = item;
    const existing = await prisma.item.findFirst({
      where: { userId, title: item.title },
    });
    const record =
      existing ??
      (await prisma.item.create({
        data: {
          ...fields,
          favoritedAt: fields.isFavorite ? new Date() : null,
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

async function seedContent(userId: string, typeIds: Map<string, string>) {
  const collectionIds = await seedCollections(userId);
  const tagIds = await seedTags(userId);
  await seedItems(userId, typeIds, collectionIds, tagIds);
}

// The Pro demo user gets an active subscription with no Stripe customer, so it
// is a real Pro grant: it is created on the development database only.
async function seedProUser(typeIds: Map<string, string>) {
  if (!isDevDatabase(connectionString)) {
    console.log(`Skipped ${demoProUser.email}: not the development database`);
    return;
  }
  const user = await seedUser(demoProUser);
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { status: "active" },
    create: { userId: user.id, status: "active" },
  });
  await seedContent(user.id, typeIds);
  console.log(`Seeded Pro demo user ${user.email}`);
}

async function main() {
  const typeIds = await seedSystemItemTypes();
  const user = await seedUser(demoUser);
  await seedContent(user.id, typeIds);
  console.log(
    `Seeded ${typeIds.size} system types, demo user ${user.email}, ` +
      `${collections.length} collections, ${items.length} items`,
  );
  await seedProUser(typeIds);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
