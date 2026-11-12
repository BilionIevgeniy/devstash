import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { searchUserCollections } from "@/features/collections/queries/search";
import { prisma } from "@/lib/prisma";

// Read-only: one seed for the file. A and B both have "React Patterns" and
// "Favorites", so a leak across users would show up as two rows.
let t: Tenants;
let described: string;

beforeAll(async () => {
  t = await seedTenants();
  // Written directly: a query's test may not import a service (lint).
  ({ id: described } = await prisma.collection.create({
    data: {
      userId: t.a.userId,
      name: "Shell",
      description: "Everyday terminal one-liners",
    },
    select: { id: true },
  }));
});

const find = async (userId: string, text: string) =>
  idsOf(await searchUserCollections(userId, text));

describe("searchUserCollections", () => {
  it("finds a collection by its name, a prefix and a typo", async () => {
    expect(await find(t.a.userId, "React Patterns")).toEqual([
      t.a.collections.main,
    ]);
    expect(await find(t.a.userId, "patt")).toEqual([t.a.collections.main]);
    expect(await find(t.a.userId, "Reakt Patterns")).toEqual([
      t.a.collections.main,
    ]);
  });

  it("finds a collection by a word of its description", async () => {
    expect(await find(t.a.userId, "terminal")).toEqual([described]);
  });

  it("counts the items of a result", async () => {
    const [main] = await searchUserCollections(t.a.userId, "React");
    expect(main.itemCount).toBe(1);
  });

  it("finds only the caller's collections", async () => {
    expect(await find(t.b.userId, "React")).toEqual([t.b.collections.main]);
    expect(await find(t.a.userId, "React")).toEqual([t.a.collections.main]);
    expect(await find(t.b.userId, "terminal")).toEqual([]);
  });

  it("answers punctuation alone with nothing", async () => {
    expect(await find(t.a.userId, "!!")).toEqual([]);
  });
});
