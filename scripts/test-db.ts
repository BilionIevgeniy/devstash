import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { systemItemTypes } from "../prisma/seed-data";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_USER_EMAIL } from "../prisma/demo-user";

const CASCADE_EMAIL_PREFIX = "cascade-test-";

class Rollback extends Error {}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

let failures = 0;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function check(name: string, run: () => Promise<string | void>) {
  try {
    const detail = await run();
    console.log(`PASS  ${name}${detail ? ` - ${detail}` : ""}`);
  } catch (error) {
    failures++;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL  ${name} - ${message}`);
  }
}

async function checkConnection() {
  const [row] = await prisma.$queryRaw<
    { db: string; version: string }[]
  >`SELECT current_database() AS db, version() AS version`;
  return `${row.db}, ${row.version.split(" on ")[0]}`;
}

async function checkRowCounts() {
  const counts = {
    User: await prisma.user.count(),
    Account: await prisma.account.count(),
    Session: await prisma.session.count(),
    VerificationToken: await prisma.verificationToken.count(),
    Item: await prisma.item.count(),
    ItemType: await prisma.itemType.count(),
    Collection: await prisma.collection.count(),
    ItemCollection: await prisma.itemCollection.count(),
    Tag: await prisma.tag.count(),
    ItemTag: await prisma.itemTag.count(),
  };
  return Object.entries(counts)
    .map(([table, count]) => `${table}=${count}`)
    .join(" ");
}

async function checkSystemItemTypes() {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true, userId: null },
  });
  assert(
    types.length === systemItemTypes.length,
    `expected ${systemItemTypes.length} system types, found ${types.length}`,
  );
  for (const expected of systemItemTypes) {
    const match = types.find((type) => type.name === expected.name);
    assert(match !== undefined, `missing system type: ${expected.name}`);
    assert(
      match.icon === expected.icon && match.color === expected.color,
      `wrong icon or color for ${expected.name}`,
    );
  }
  return types.map((type) => type.name).join(", ");
}

async function checkDemoUser() {
  const user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
  assert(user !== null, `demo user ${DEMO_USER_EMAIL} not found`);
  assert(
    user.password?.startsWith("$2") === true,
    "demo user password is not a bcrypt hash",
  );
  return user.email;
}

async function checkRelations() {
  const items = await prisma.item.findMany({
    include: { type: true, tags: true, collections: true },
  });
  assert(items.length > 0, "no items found");
  assert(
    items.every((item) => item.type.name.length > 0),
    "an item has no type",
  );
  const multi = items.filter((item) => item.collections.length > 1);
  assert(multi.length > 0, "no item belongs to several collections");
  return `${items.length} items, ${multi.length} in several collections`;
}

async function checkCascadeDeletes() {
  const email = `${CASCADE_EMAIL_PREFIX}${Date.now()}@example.com`;
  await prisma
    .$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email } });
      const type = await tx.itemType.findFirstOrThrow({
        where: { isSystem: true },
      });
      const collection = await tx.collection.create({
        data: { name: "cascade", userId: user.id },
      });
      const tag = await tx.tag.create({
        data: { name: "cascade", userId: user.id },
      });
      const item = await tx.item.create({
        data: {
          title: "cascade",
          contentType: "TEXT",
          userId: user.id,
          typeId: type.id,
          collections: { create: { collectionId: collection.id } },
          tags: { create: { tagId: tag.id } },
        },
      });

      await tx.user.delete({ where: { id: user.id } });

      const leftovers = {
        items: await tx.item.count({ where: { id: item.id } }),
        collections: await tx.collection.count({ where: { id: collection.id } }),
        tags: await tx.tag.count({ where: { id: tag.id } }),
        itemCollections: await tx.itemCollection.count({
          where: { itemId: item.id },
        }),
        itemTags: await tx.itemTag.count({ where: { itemId: item.id } }),
      };
      assert(
        Object.values(leftovers).every((count) => count === 0),
        `rows survived user delete: ${JSON.stringify(leftovers)}`,
      );
      throw new Rollback();
    })
    .catch((error: unknown) => {
      if (!(error instanceof Rollback)) throw error;
    });

  const left = await prisma.user.count({
    where: { email: { startsWith: CASCADE_EMAIL_PREFIX } },
  });
  assert(left === 0, "cascade test user was not rolled back");
  return "user delete cascades to items, collections, tags and links (rolled back)";
}

async function main() {
  await check("connection", checkConnection);
  await check("row counts", checkRowCounts);
  await check("system item types", checkSystemItemTypes);
  await check("demo user", checkDemoUser);
  await check("relations", checkRelations);
  await check("cascade deletes", checkCascadeDeletes);

  console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) failed`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
