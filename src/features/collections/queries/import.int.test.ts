import { beforeEach, describe, expect, it } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { getCollectionIdsByName } from "@/features/collections/queries/import";
import { prisma } from "@/lib/prisma";

let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

describe("getCollectionIdsByName", () => {
  it("maps a name to the caller's oldest collection of that name", async () => {
    await prisma.collection.create({
      data: { userId: t.b.userId, name: "React Patterns" },
    });

    const ids = await getCollectionIdsByName(t.b.userId, ["React Patterns"]);

    expect(ids.get("React Patterns")).toBe(t.b.collections.main);
  });

  it("never maps to the other tenant's collection", async () => {
    await prisma.collection.deleteMany({
      where: { userId: t.a.userId, name: "React Patterns" },
    });
    expect(
      (await getCollectionIdsByName(t.b.userId, ["React Patterns"])).size,
    ).toBe(1);

    const ids = await getCollectionIdsByName(t.a.userId, ["React Patterns"]);

    expect(ids.size).toBe(0);
  });
});
