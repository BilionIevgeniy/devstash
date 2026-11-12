import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { getExportCollections } from "@/features/collections/queries/export";

let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("getExportCollections", () => {
  it("reads every collection of the caller and none of the other's", async () => {
    const ofB = idsOf(await getExportCollections(t.b.userId));
    expect(ofB.toSorted()).toEqual(Object.values(t.b.collections).toSorted());

    const ofA = idsOf(await getExportCollections(t.a.userId));
    expect(ofA.toSorted()).toEqual(Object.values(t.a.collections).toSorted());
  });
});
