import { beforeEach, describe, expect, it } from "vitest";
import {
  createItem,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import { createUserCollection } from "@/features/collections/services/collection";
import { exportUserData } from "@/features/import-export/services/export";
import {
  importUserCollections,
  importUserItems,
  importUserTypes,
} from "@/features/import-export/services/import";
import type { CollectionImportData } from "@/features/import-export/types";
import { setUserItemAiContent } from "@/features/items/services/item";
import { prisma } from "@/lib/postgres/prisma";

// B is on Pro, so B imports. A holds rows that look like B's import, and they
// must neither stop B's records nor receive them.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

interface ExportJson {
  collections: unknown[];
  items: { collectionIds: string[] }[];
}

async function exportOf(userId: string): Promise<ExportJson> {
  const result = await exportUserData(userId, new Date());
  if (result.status !== "ok")
    throw new Error(`Export refused: ${result.status}`);
  return JSON.parse(await new Response(result.stream).text()) as ExportJson;
}

// What the browser does: collections first, the items linked to their new ids.
async function importAll(userId: string, file: ExportJson) {
  const collections = await importUserCollections(userId, file.collections);
  if (collections.status !== "ok") throw new Error(collections.status);
  const { idMap }: CollectionImportData = collections.data;
  const items = file.items.map((item) => ({
    ...item,
    collectionIds: item.collectionIds.flatMap((id) => idMap[id] ?? []),
  }));
  const result = await importUserItems(userId, items);
  if (result.status !== "ok") throw new Error(result.status);
  return { collections: collections.data.summary, items: result.data };
}

describe("an import of the user's own export", () => {
  it("recreates items, tags and collections in an emptied account, and creates nothing twice", async () => {
    const file = await exportOf(t.b.userId);
    await prisma.item.deleteMany({
      where: { userId: t.b.userId, fileKey: null },
    });
    await prisma.collection.deleteMany({ where: { userId: t.b.userId } });

    const first = await importAll(t.b.userId, file);
    expect(first.collections).toMatchObject({ created: 2, duplicates: 0 });
    expect(first.items).toMatchObject({ created: 3, files: 1, failed: [] });
    const snippet = await prisma.item.findFirstOrThrow({
      where: { userId: t.b.userId, title: "useDebounce" },
      select: {
        searchTags: true,
        tags: { select: { tag: { select: { name: true } } } },
        collections: { select: { collection: { select: { name: true } } } },
      },
    });
    expect(snippet.searchTags).toBe("react shared");
    expect(snippet.collections).toEqual([
      { collection: { name: "React Patterns" } },
    ]);

    const before = await snapshotTenant(t.b.userId);
    const second = await importAll(t.b.userId, file);
    expect(second.collections).toMatchObject({ created: 0, duplicates: 2 });
    expect(second.items).toMatchObject({ created: 0, duplicates: 3 });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

// ADR 0027: the marks travel with the export and come back with the import.
it("keeps the AI marks through an export and an import", async () => {
  await setUserItemAiContent(t.b.userId, t.b.items.snippet, "Better code");
  await prisma.itemTag.updateMany({
    where: { itemId: t.b.items.snippet, tag: { name: "react" } },
    data: { aiGenerated: true },
  });
  const file = await exportOf(t.b.userId);
  await prisma.item.deleteMany({
    where: { userId: t.b.userId, fileKey: null },
  });
  await prisma.collection.deleteMany({ where: { userId: t.b.userId } });

  await importAll(t.b.userId, file);

  const snippet = await prisma.item.findFirstOrThrow({
    where: { userId: t.b.userId, title: "useDebounce" },
    select: {
      contentAiGenerated: true,
      descriptionAiGenerated: true,
      tags: {
        select: { aiGenerated: true, tag: { select: { name: true } } },
        orderBy: { tag: { name: "asc" } },
      },
    },
  });
  expect(snippet).toEqual({
    contentAiGenerated: true,
    descriptionAiGenerated: false,
    tags: [
      { aiGenerated: true, tag: { name: "react" } },
      { aiGenerated: false, tag: { name: "shared" } },
    ],
  });
});

describe("custom types", () => {
  const RECIPES = { name: "Recipes", icon: "Code", color: "#3b82f6" };

  it("creates the importer's missing types first, so their items find them", async () => {
    const types = await importUserTypes(t.b.userId, [RECIPES]);
    expect(types).toMatchObject({ status: "ok", data: { created: 1 } });
    const items = await importUserItems(t.b.userId, [
      { type: "recipes", title: "Pancakes", content: "flour" },
    ]);
    expect(items).toMatchObject({ status: "ok", data: { created: 1 } });
    const again = await importUserItems(t.b.userId, [
      { type: "Recipes", title: "Pancakes", content: "flour" },
    ]);
    expect(again).toMatchObject({ status: "ok", data: { duplicates: 1 } });
  });

  it("counts a type the importer has, in any case, as already there", async () => {
    await importUserTypes(t.b.userId, [RECIPES]);
    const before = await snapshotTenant(t.b.userId);
    const again = await importUserTypes(t.b.userId, [
      { ...RECIPES, name: "RECIPES" },
    ]);
    expect(again).toMatchObject({ status: "ok", data: { duplicates: 1 } });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  it("creates B's own type when only A has one of the name, and leaves A", async () => {
    await prisma.itemType.create({
      data: { name: "Recipes", slug: "recipes", userId: t.a.userId },
    });
    const before = await snapshotTenant(t.a.userId);
    const result = await importUserTypes(t.b.userId, [RECIPES]);
    expect(result).toMatchObject({ status: "ok", data: { created: 1 } });
    await expect(
      prisma.itemType.count({ where: { userId: t.b.userId, name: "Recipes" } }),
    ).resolves.toBe(1);
    expect(await snapshotTenant(t.a.userId)).toEqual(before);
  });

  it("refuses an item of a type the importer lacks, even if another user has it", async () => {
    await prisma.itemType.create({
      data: { name: "Recipes", slug: "recipes", userId: t.a.userId },
    });
    const result = await importUserItems(t.b.userId, [
      { type: "Recipes", title: "Pancakes", content: "flour" },
    ]);
    expect(result).toMatchObject({
      status: "ok",
      data: { created: 0, failed: [{ reason: { error: "invalidItemType" } }] },
    });
  });
});

describe("across tenants", () => {
  it("creates B's records when only A has them, and leaves A unchanged", async () => {
    await createItem(t.a.userId, {
      typeName: "note",
      title: "Only A",
      content: "text",
    });
    const onlyA = await createUserCollection(t.a.userId, {
      name: "Only A",
      description: null,
    });
    const before = await snapshotTenant(t.a.userId);

    const result = await importAll(t.b.userId, {
      collections: [{ id: "old-1", name: "Only A" }],
      items: [
        {
          type: "note",
          title: "Only A",
          content: "text",
          collectionIds: ["old-1"],
        },
      ] as unknown as ExportJson["items"],
    });

    expect(result.collections.created).toBe(1);
    expect(result.items.created).toBe(1);
    const bCollection = await prisma.collection.findFirstOrThrow({
      where: { userId: t.b.userId, name: "Only A" },
    });
    expect(bCollection.id).not.toBe(onlyA.data?.id);
    expect(await snapshotTenant(t.a.userId)).toEqual(before);
  });

  it("refuses A, on the Free plan, and writes nothing", async () => {
    const before = await snapshotTenant(t.a.userId);
    await expect(
      importUserItems(t.a.userId, [{ type: "note", title: "x" }]),
    ).resolves.toEqual({ status: "forbidden" });
    expect(await snapshotTenant(t.a.userId)).toEqual(before);
  });
});
