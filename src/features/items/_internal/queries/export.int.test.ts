import { beforeAll, describe, expect, it } from "vitest";
import {
  allItemIds,
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../../test/integration/fixtures";
import { getExportItemRows } from "@/features/items/_internal/queries/export";

let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("getExportItemRows", () => {
  it("pages through the caller's items only, in id order", async () => {
    const first = await getExportItemRows(t.b.userId, null, 2);
    const rest = await getExportItemRows(t.b.userId, first.nextCursor, 100);

    expect(first.rows).toHaveLength(2);
    expect(rest.nextCursor).toBeNull();
    expect(idsOf([...first.rows, ...rest.rows])).toEqual(
      allItemIds(t.b).toSorted(),
    );
    const ofA = await getExportItemRows(t.a.userId, null, 100);
    expect(idsOf(ofA.rows)).toEqual(allItemIds(t.a).toSorted());
  });

  it("carries the type, tags and collections of a row", async () => {
    const { rows } = await getExportItemRows(t.b.userId, null, 100);
    expect(rows.find(({ id }) => id === t.b.items.snippet)).toMatchObject({
      type: "snippet",
      tags: ["react", "shared"],
      collectionIds: [t.b.collections.main],
    });
  });
});
