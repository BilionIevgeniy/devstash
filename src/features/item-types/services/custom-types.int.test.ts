import { beforeEach, describe, expect, it } from "vitest";

import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import {
  getCustomTypes,
  getItemTypeBySlug,
  getSidebarItemTypes,
  getUserItemTypeByName,
} from "@/features/item-types/queries";
import {
  createCustomType,
  deleteCustomType,
  updateCustomType,
} from "@/features/item-types/services/custom-types";
import { prisma } from "@/lib/postgres/prisma";

const RECIPES = { name: "Recipes", icon: "Code", color: "#3b82f6" } as const;

// An item of B's type, written directly: items sits above item-types, so its
// create service is tested with custom types in items/services.
function itemOfB() {
  return prisma.item.create({
    data: {
      userId: t.b.userId,
      typeId: typeOfB.id,
      title: "Pancakes",
      contentType: "TEXT",
    },
  });
}

let t: Tenants;
let typeOfB: { id: string; slug: string };

// A is on the Free plan in the fixture; the cross-user cases need A on Pro
// too, so a refusal is "not yours" and not "not on Pro".
async function makeAPro() {
  await prisma.subscription.create({
    data: { userId: t.a.userId, status: "active" },
  });
}

async function createOfB() {
  const result = await createCustomType(t.b.userId, RECIPES);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

beforeEach(async () => {
  t = await seedTenants();
  typeOfB = await createOfB();
});

describe("createCustomType", () => {
  it("creates a Pro user's type with a slug from its name", async () => {
    expect(typeOfB.slug).toBe("recipes");
    const own = await getCustomTypes(t.b.userId);
    expect(own).toMatchObject([
      { id: typeOfB.id, name: "Recipes", itemCount: 0 },
    ]);
  });

  it("refuses a Free user in the service, not only in the interface", async () => {
    await expect(createCustomType(t.a.userId, RECIPES)).resolves.toMatchObject({
      success: false,
      error: "customTypesProOnly",
    });
    await expect(getCustomTypes(t.a.userId)).resolves.toEqual([]);
  });

  it("refuses a second type of the same name in another case", async () => {
    const again = await createCustomType(t.b.userId, {
      ...RECIPES,
      name: "recipes",
    });
    expect(again).toMatchObject({ success: false, error: "typeNameTaken" });
  });

  it("creates one of two types of the same name ordered at once", async () => {
    const both = await Promise.all([
      createCustomType(t.b.userId, { ...RECIPES, name: "Twice" }),
      createCustomType(t.b.userId, { ...RECIPES, name: "twice" }),
    ]);
    expect(both.filter((result) => result.success)).toHaveLength(1);
  });

  it("stops at 50 types", async () => {
    await prisma.itemType.createMany({
      data: Array.from({ length: 49 }, (_, index) => ({
        userId: t.b.userId,
        name: `Type ${index}`,
        slug: `type-${index}`,
        icon: "Code",
      })),
    });
    await expect(
      createCustomType(t.b.userId, { ...RECIPES, name: "One more" }),
    ).resolves.toMatchObject({
      success: false,
      error: "customTypeLimitReached",
    });
  });

  it("gives another user the same slug: slugs are per owner", async () => {
    await makeAPro();
    const ofA = await createCustomType(t.a.userId, RECIPES);
    expect(ofA).toMatchObject({ success: true, data: { slug: "recipes" } });
  });
});

describe("updateCustomType", () => {
  it("renames the type and keeps its slug", async () => {
    const result = await updateCustomType(t.b.userId, typeOfB.id, {
      ...RECIPES,
      name: "Cooking",
    });
    expect(result.success).toBe(true);
    await expect(
      getItemTypeBySlug(t.b.userId, "recipes"),
    ).resolves.toMatchObject({
      id: typeOfB.id,
      name: "Cooking",
    });
  });

  it("changes that type only, and not to the name of another", async () => {
    const other = await createCustomType(t.b.userId, {
      ...RECIPES,
      name: "Runbooks",
    });
    const rename = (name: string) =>
      updateCustomType(t.b.userId, typeOfB.id, { ...RECIPES, name });

    await expect(rename("RUNBOOKS")).resolves.toMatchObject({
      error: "typeNameTaken",
    });
    await expect(rename("recipes")).resolves.toMatchObject({ success: true });
    const names = (await getCustomTypes(t.b.userId)).map(({ name }) => name);
    expect(names.toSorted()).toEqual(["Runbooks", "recipes"]);
    expect(other.success).toBe(true);
  });

  it("is refused once Pro has ended", async () => {
    await prisma.subscription.update({
      where: { userId: t.b.userId },
      data: { status: "canceled" },
    });
    await expect(
      updateCustomType(t.b.userId, typeOfB.id, { ...RECIPES, name: "Late" }),
    ).resolves.toMatchObject({ error: "customTypesProOnly" });
  });

  it("cannot rename another user's type", async () => {
    await makeAPro();
    const before = await snapshotTenant(t.b.userId);
    await expect(
      updateCustomType(t.a.userId, typeOfB.id, { ...RECIPES, name: "Mine" }),
    ).resolves.toMatchObject({
      success: false,
      error: "typeNotFound",
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

describe("deleteCustomType", () => {
  it("deletes an empty type of the owner", async () => {
    await expect(
      deleteCustomType(t.b.userId, typeOfB.id),
    ).resolves.toMatchObject({
      success: true,
    });
    await expect(getCustomTypes(t.b.userId)).resolves.toEqual([]);
  });

  it("deletes that type only", async () => {
    await createCustomType(t.b.userId, { ...RECIPES, name: "Kept" });
    await deleteCustomType(t.b.userId, typeOfB.id);
    await expect(getCustomTypes(t.b.userId)).resolves.toMatchObject([
      { name: "Kept" },
    ]);
  });

  it("refuses a type that still has items", async () => {
    await itemOfB();
    await expect(
      deleteCustomType(t.b.userId, typeOfB.id),
    ).resolves.toMatchObject({
      success: false,
      error: "typeHasItems",
    });
  });

  it("cannot delete another user's type", async () => {
    const before = await snapshotTenant(t.b.userId);
    await expect(
      deleteCustomType(t.a.userId, typeOfB.id),
    ).resolves.toMatchObject({
      success: false,
      error: "typeNotFound",
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

describe("the reads of custom types", () => {
  it("find B's type for B and never for A", async () => {
    await expect(
      getUserItemTypeByName(t.b.userId, "RECIPES"),
    ).resolves.toMatchObject({
      id: typeOfB.id,
    });
    await expect(
      getUserItemTypeByName(t.a.userId, "Recipes"),
    ).resolves.toBeNull();
    await expect(getItemTypeBySlug(t.a.userId, "recipes")).resolves.toBeNull();
    await expect(getCustomTypes(t.a.userId)).resolves.toEqual([]);
  });

  it("matches a name exactly but for case: `_`, `%` and `\\` are no wildcards", async () => {
    const names = ["To-Do", "To_Do", "%", "C:\\Notes"];
    const ids = new Map<string, string>();
    for (const [index, name] of names.entries()) {
      const row = await prisma.itemType.create({
        data: { name, slug: `odd-${index}`, userId: t.b.userId },
      });
      ids.set(name, row.id);
    }
    for (const name of names) {
      await expect(
        getUserItemTypeByName(t.b.userId, name.toLowerCase()),
      ).resolves.toMatchObject({ id: ids.get(name) });
    }
    await expect(
      getUserItemTypeByName(t.b.userId, "To Do"),
    ).resolves.toBeNull();
  });

  it("a lookup of a system name never returns a user's type", async () => {
    await prisma.itemType.create({
      data: { name: "snippet", slug: "legacy", userId: t.b.userId },
    });
    const found = await getUserItemTypeByName(t.b.userId, "snippet");
    expect(found?.slug).toBe("snippets");
  });

  it("list B's types in the sidebar after the system types, and not A's", async () => {
    const names = (rows: { name: string }[]) => rows.map((row) => row.name);
    const ofB = names(await getSidebarItemTypes(t.b.userId));
    expect(ofB.at(-1)).toBe("Recipes");
    expect(ofB.slice(0, 7)).toEqual([
      "snippet",
      "prompt",
      "command",
      "note",
      "file",
      "image",
      "link",
    ]);
    expect(names(await getSidebarItemTypes(t.a.userId))).not.toContain(
      "Recipes",
    );
  });
});

describe("deleting the account", () => {
  // The row delete of deleteVerifiedUserRows (auth/services/account.ts).
  it("removes the user's types together with their items", async () => {
    await itemOfB();
    await prisma.user.delete({ where: { id: t.b.userId } });
    await expect(
      prisma.itemType.count({ where: { id: typeOfB.id } }),
    ).resolves.toBe(0);
  });
});
