import { beforeAll, describe, expect, it } from "vitest";
import {
  allItemIds,
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { exportUserData } from "@/features/import-export/services/export";
import { prisma } from "@/lib/postgres/prisma";

// The export reads only the caller's rows, whatever the other tenant holds.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
  await prisma.itemType.createMany({
    data: [
      {
        name: "Recipes",
        slug: "recipes",
        icon: "Code",
        color: "#3b82f6",
        userId: t.b.userId,
      },
      { name: "Only A", slug: "only-a", userId: t.a.userId },
    ],
  });
});

interface ExportJson {
  version: number;
  types: { name: string }[];
  collections: { id: string }[];
  items: { id: string; collectionIds: string[]; tags: string[] }[];
}

async function exportOf(userId: string): Promise<ExportJson> {
  const result = await exportUserData(userId, new Date());
  if (result.status !== "ok")
    throw new Error(`Export refused: ${result.status}`);
  return JSON.parse(await new Response(result.stream).text()) as ExportJson;
}

describe("exportUserData", () => {
  it("writes all of B's items and collections and none of A's", async () => {
    const file = await exportOf(t.b.userId);

    expect(file.version).toBe(1);
    expect(idsOf(file.items).toSorted()).toEqual(allItemIds(t.b).toSorted());
    expect(idsOf(file.collections).toSorted()).toEqual(
      Object.values(t.b.collections).toSorted(),
    );
    const snippet = file.items.find(({ id }) => id === t.b.items.snippet);
    expect(snippet).toMatchObject({
      collectionIds: [t.b.collections.main],
      tags: ["react", "shared"],
    });
  });

  it("writes B's custom types without ids or slugs, and none of A's", async () => {
    const file = await exportOf(t.b.userId);
    expect(file.types).toEqual([
      { name: "Recipes", icon: "Code", color: "#3b82f6" },
    ]);
  });

  it("refuses A, on the Free plan", async () => {
    await expect(exportUserData(t.a.userId, new Date())).resolves.toEqual({
      status: "forbidden",
    });
  });

  it("stays possible once Pro has ended", async () => {
    await prisma.subscription.update({
      where: { userId: t.b.userId },
      data: { status: "canceled" },
    });

    const file = await exportOf(t.b.userId);

    expect(idsOf(file.items).toSorted()).toEqual(allItemIds(t.b).toSorted());
  });
});
