import { beforeAll, describe, expect, it } from "vitest";
import {
  seedTenants,
  systemTypeId,
  type Tenants,
} from "../../../test/integration/fixtures";
import {
  getItemTypeByName,
  getItemTypeBySlug,
  getItemTypesById,
  getSidebarItemTypes,
} from "@/features/item-types/queries";
import { prisma } from "@/lib/postgres/prisma";

let t: Tenants;
let customTypeOfB: string;

// Custom types are not built yet; a row is inserted here to pin that the
// lookups never hand out someone else's.
beforeAll(async () => {
  t = await seedTenants();
  const custom = await prisma.itemType.create({
    data: {
      name: "snippet",
      slug: "snippets",
      userId: t.b.userId,
      isSystem: false,
    },
  });
  customTypeOfB = custom.id;
});

describe("getItemTypesById", () => {
  it("reads system types and the caller's own, never another user's", async () => {
    const snippet = await systemTypeId("snippet");
    const own = await getItemTypesById(t.b.userId, [snippet, customTypeOfB]);
    expect([...own.keys()].sort()).toEqual([snippet, customTypeOfB].sort());
    const other = await getItemTypesById(t.a.userId, [snippet, customTypeOfB]);
    expect([...other.keys()]).toEqual([snippet]);
  });
});

describe("getItemTypeByName", () => {
  it("finds the system type, not a user's type of the same name", async () => {
    const snippet = await systemTypeId("snippet");
    await expect(getItemTypeByName("snippet")).resolves.toMatchObject({
      id: snippet,
    });
  });
});

describe("getItemTypeBySlug", () => {
  it("finds a system type by its slug for any user", async () => {
    const snippet = await systemTypeId("snippet");
    await expect(
      getItemTypeBySlug(t.a.userId, "snippets"),
    ).resolves.toMatchObject({ id: snippet });
  });

  it("finds the caller's own type, never another user's of the same slug", async () => {
    const own = await prisma.itemType.create({
      data: { name: "Recipes", slug: "recipes", userId: t.b.userId },
    });
    await expect(
      getItemTypeBySlug(t.b.userId, "recipes"),
    ).resolves.toMatchObject({ id: own.id });
    await expect(getItemTypeBySlug(t.a.userId, "recipes")).resolves.toBeNull();
    await prisma.itemType.delete({ where: { id: own.id } });
  });
});

describe("getSidebarItemTypes", () => {
  it("counts only the caller's items of each type", async () => {
    const counts = (rows: { name: string; itemCount: number }[]) =>
      Object.fromEntries(rows.map((row) => [row.name, row.itemCount]));
    const a = counts(await getSidebarItemTypes(t.a.userId));
    const b = counts(await getSidebarItemTypes(t.b.userId));
    expect(a).toMatchObject({ snippet: 1, note: 1, link: 1, file: 0 });
    expect(b).toMatchObject({ snippet: 1, note: 1, link: 1, file: 1 });
  });
});
