import { beforeAll, describe, expect, it } from "vitest";
import {
  createItem,
  idsOf,
  seedTenants,
  systemTypeId,
  type Tenants,
} from "../../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../../test/integration/snapshot";
import { getUploadItemsOfType } from "@/features/items/_internal/queries/type-list";
import {
  countItemsOfType,
  getItemsOfType,
  getTypeTagNames,
} from "@/features/items/queries";

// Read-only after the seed: the tenants, plus titles for the A-Z order on A's
// snippets and a tag only B uses. The owner's call finds the rows first, so an
// empty answer for A means "not yours", not "wrong fixture id".
let t: Tenants;
let snippet: string;

// The order of the ICU root collation (migration item_title_icu_collation):
// by letter, small before capital, accents after the plain letter. If a later
// migration drops the collation, C.UTF-8 puts every capital first and this
// fails.
const TITLES_A_Z = ["_x", "apple", "Apple", "Banana", "Éclair", "zebra"];

beforeAll(async () => {
  t = await seedTenants();
  snippet = await systemTypeId("snippet");
  for (const title of ["zebra", "Apple", "Éclair", "_x", "Banana", "apple"]) {
    await createItem(t.a.userId, { typeName: "snippet", title, content: "x" });
  }
  await createItem(t.b.userId, {
    typeName: "snippet",
    title: "Only B",
    content: "x",
    tags: ["b-only"],
  });
});

function titlesOf(rows: { title: string }[]): string[] {
  return rows.map(({ title }) => title);
}

describe("the sort of a type page", () => {
  it("puts the pin first, then the titles by letter, not capitals first", async () => {
    const rows = await getItemsOfType(
      t.a.userId,
      snippet,
      { sort: "a-z", tag: null },
      0,
      21,
    );
    expect(titlesOf(rows)).toEqual(["useDebounce", ...TITLES_A_Z]);

    const reversed = await getItemsOfType(
      t.a.userId,
      snippet,
      { sort: "z-a", tag: null },
      0,
      21,
    );
    expect(titlesOf(reversed)).toEqual([
      "useDebounce",
      ...TITLES_A_Z.toReversed(),
    ]);
  });

  it("reads the position it is given, in the sort", async () => {
    const rows = await getItemsOfType(
      t.a.userId,
      snippet,
      { sort: "a-z", tag: null },
      2,
      2,
    );
    expect(titlesOf(rows)).toEqual(["apple", "Apple"]);
  });
});

describe("the tag filter shows only the caller's items", () => {
  it("counts and reads B's tagged item for B and nothing for A", async () => {
    const filter = { sort: "newest", tag: "b-only" } as const;
    const before = await snapshotTenant(t.b.userId);

    await expect(countItemsOfType(t.b.userId, snippet, "b-only")).resolves.toBe(
      1,
    );
    const own = await getItemsOfType(t.b.userId, snippet, filter, 0, 21);
    expect(titlesOf(own)).toEqual(["Only B"]);

    await expect(countItemsOfType(t.a.userId, snippet, "b-only")).resolves.toBe(
      0,
    );
    await expect(
      getItemsOfType(t.a.userId, snippet, filter, 0, 21),
    ).resolves.toEqual([]);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  // Both users have a tag "react": the match is by the caller's own tag.
  it("matches a tag name both users have only on the caller's items", async () => {
    const filter = { sort: "newest", tag: "react" } as const;
    const [a, b] = await Promise.all([
      getItemsOfType(t.a.userId, snippet, filter, 0, 21),
      getItemsOfType(t.b.userId, snippet, filter, 0, 21),
    ]);
    expect(idsOf(a)).toEqual([t.a.items.snippet]);
    expect(idsOf(b)).toEqual([t.b.items.snippet]);
  });

  it("offers the caller's tags on items of the type, not B's or unused ones", async () => {
    await expect(getTypeTagNames(t.b.userId, snippet)).resolves.toEqual([
      "b-only",
      "react",
      "shared",
    ]);
    await expect(getTypeTagNames(t.a.userId, snippet)).resolves.toEqual([
      "react",
      "shared",
    ]);
  });
});

describe("getUploadItemsOfType", () => {
  it("reads B's upload for B and nothing for A", async () => {
    const file = await systemTypeId("file");
    const filter = { sort: "newest", tag: null } as const;
    const own = await getUploadItemsOfType(t.b.userId, file, filter, 0, 21);
    expect(idsOf(own)).toEqual([t.b.items.file]);
    await expect(
      getUploadItemsOfType(t.a.userId, file, filter, 0, 21),
    ).resolves.toEqual([]);
    await expect(countItemsOfType(t.a.userId, file, null)).resolves.toBe(0);
  });
});
