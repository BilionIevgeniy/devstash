import { beforeEach, describe, expect, it } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { getItemIdentities } from "@/features/items/queries/import";
import { prisma } from "@/lib/prisma";

let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

describe("getItemIdentities", () => {
  it("finds the caller's items by title, never the other tenant's", async () => {
    expect(await getItemIdentities(t.b.userId, ["useDebounce"])).toEqual([
      {
        typeName: "snippet",
        title: "useDebounce",
        content: "export function useDebounce() {}",
        url: null,
      },
    ]);

    await prisma.item.deleteMany({
      where: { userId: t.a.userId, title: "useDebounce" },
    });
    expect(await getItemIdentities(t.a.userId, ["useDebounce"])).toEqual([]);
  });
});
