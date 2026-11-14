import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  idsOf,
  seedTenants,
  systemTypeId,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import { favoriteKeyset } from "@/features/items/_internal/queries/list-keyset";
import {
  FAVORITE_ITEM_SORTS,
  type FavoriteItemSort,
} from "@/features/items/domain/favorite-sort";
import { FAVORITES_PAGE_SIZE } from "@/features/items/domain/list-pages";
import {
  PINNED_ITEM_SORTS,
  type PinnedItemSort,
} from "@/features/items/domain/pinned-items";
import {
  countFavoriteItems,
  getFavoriteItemPage,
  getPinnedFirstPages,
  getPinnedGroupPage,
} from "@/features/items/queries/lists";
import {
  favoritePageQuerySchema,
  pinnedPageQuerySchema,
} from "@/features/items/schemas";
import { prisma } from "@/lib/prisma";

const BULK_COUNT = 95;
// Few distinct values, so every sort has long runs of ties that only the id
// settles: a page boundary falls inside a run.
const TITLES = ["apple", "Apple", "banana", "Same"];
const DATES = [
  new Date("2026-03-01T10:00:00.000Z"),
  new Date("2026-03-02T10:00:00.000Z"),
];
const TYPES = ["note", "snippet", "command"];

// createMany on purpose, as the search test does: 95 creates through the
// service would be slow, and B's plan has no item limit anyway.
async function seedBulk(userId: string): Promise<void> {
  const typeIds = await Promise.all(TYPES.map(systemTypeId));
  await prisma.item.createMany({
    data: Array.from({ length: BULK_COUNT }, (_, i) => ({
      userId,
      typeId: typeIds[i % typeIds.length],
      contentType: "TEXT",
      title: TITLES[i % TITLES.length],
      content: `bulk ${i}`,
      isFavorite: true,
      favoritedAt: DATES[i % DATES.length],
      isPinned: true,
      createdAt: DATES[(i + 1) % DATES.length],
    })),
  });
}

async function walkFavorites(userId: string, sort: FavoriteItemSort) {
  const ids: string[] = [];
  let cursor: string | undefined;
  for (let pages = 0; pages < 20; pages += 1) {
    const { after } = favoritePageQuerySchema.parse({ sort, cursor });
    const page = await getFavoriteItemPage(userId, sort, after);
    ids.push(...idsOf(page.rows));
    if (!page.nextCursor) return ids;
    cursor = page.nextCursor;
  }
  throw new Error("The pages never ended");
}

async function walkPinnedGroup(
  userId: string,
  typeId: string,
  sort: PinnedItemSort,
) {
  const ids: string[] = [];
  let cursor: string | undefined;
  for (let pages = 0; pages < 20; pages += 1) {
    const { after } = pinnedPageQuerySchema.parse({ typeId, sort, cursor });
    const page = await getPinnedGroupPage(userId, typeId, sort, after);
    ids.push(...idsOf(page.rows));
    if (!page.nextCursor) return ids;
    cursor = page.nextCursor;
  }
  throw new Error("The pages never ended");
}

describe("the pages of an endless list", () => {
  let t: Tenants;

  beforeAll(async () => {
    t = await seedTenants();
    await seedBulk(t.b.userId);
  });

  it.each(FAVORITE_ITEM_SORTS)(
    "hold every favorite once, in the order of one full read (%s)",
    async (sort) => {
      const { orderBy } = favoriteKeyset(sort, null);
      const full = await prisma.item.findMany({
        where: { userId: t.b.userId, isFavorite: true },
        orderBy,
        select: { id: true },
      });

      const walked = await walkFavorites(t.b.userId, sort);

      expect(full).toHaveLength(BULK_COUNT + 1);
      expect(walked).toEqual(idsOf(full));
      expect(new Set(walked).size).toBe(walked.length);
    },
  );

  it.each(PINNED_ITEM_SORTS)(
    "hold every pin of a group once and stay inside its type (%s)",
    async (sort) => {
      const typeId = await systemTypeId("note");
      const ownNotes = await prisma.item.findMany({
        where: { userId: t.b.userId, isPinned: true, typeId },
        select: { id: true },
      });

      const walked = await walkPinnedGroup(t.b.userId, typeId, sort);

      expect(walked.toSorted()).toEqual(idsOf(ownNotes).toSorted());
      expect(new Set(walked).size).toBe(walked.length);
    },
  );

  it("lists every type with pins once, by name, with its count and first page", async () => {
    const groups = await getPinnedFirstPages(t.b.userId, "newest");

    expect(groups.map((group) => group.type.name)).toEqual([
      "command",
      "note",
      "snippet",
    ]);
    // The fixture's own pin is a snippet.
    const snippets = groups.find((group) => group.type.name === "snippet");
    expect(snippets?.count).toBe(Math.ceil((BULK_COUNT - 1) / 3) + 1);
    expect(snippets?.first.page.rows).toHaveLength(10);
    expect(snippets?.first.page.nextCursor).not.toBeNull();
  });

  it("counts every favorite, not one page", async () => {
    expect(await countFavoriteItems(t.b.userId)).toBe(BULK_COUNT + 1);
  });
});

describe("a page of another user", () => {
  let t: Tenants;

  beforeAll(async () => {
    t = await seedTenants();
    await seedBulk(t.b.userId);
  });

  it("holds only the caller's favorites and pins", async () => {
    const b = await getFavoriteItemPage(t.b.userId, "newest", null);
    expect(b.rows).toHaveLength(FAVORITES_PAGE_SIZE);
    const bIds = new Set(await walkFavorites(t.b.userId, "newest"));

    const a = await walkFavorites(t.a.userId, "newest");
    expect(a).toEqual([t.a.items.note]);
    expect(a.some((id) => bIds.has(id))).toBe(false);

    const aGroups = await getPinnedFirstPages(t.a.userId, "newest");
    expect(aGroups.flatMap((group) => idsOf(group.first.page.rows))).toEqual([
      t.a.items.snippet,
    ]);
  });

  it("gives an empty page for another user's type and cursor, and changes nothing", async () => {
    const noteType = await systemTypeId("note");
    const bPage = await getPinnedGroupPage(
      t.b.userId,
      noteType,
      "newest",
      null,
    );
    expect(bPage.rows.length).toBeGreaterThan(0);
    const before = await snapshotTenant(t.b.userId);
    const { after } = pinnedPageQuerySchema.parse({
      typeId: noteType,
      sort: "newest",
      cursor: bPage.nextCursor ?? undefined,
    });

    const aPage = await getPinnedGroupPage(
      t.a.userId,
      noteType,
      "newest",
      after,
    );

    expect(aPage).toEqual({ rows: [], nextCursor: null });
    expect(await countFavoriteItems(t.a.userId)).toBe(1);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

describe("a page after a change", () => {
  let t: Tenants;

  beforeEach(async () => {
    t = await seedTenants();
    await seedBulk(t.b.userId);
  });

  it("continues right after a row unstarred between two pages", async () => {
    const first = await getFavoriteItemPage(t.b.userId, "a-z", null);
    const expected = await walkFavorites(t.b.userId, "a-z");
    const lastOfFirst = first.rows.at(-1);
    if (!lastOfFirst) throw new Error("The first page is empty");
    // As the favorite toggle writes it; the query role may not import a service.
    await prisma.item.update({
      where: { id: lastOfFirst.id },
      data: { isFavorite: false, favoritedAt: null },
    });
    const { after } = favoritePageQuerySchema.parse({
      sort: "a-z",
      cursor: first.nextCursor ?? undefined,
    });

    const second = await getFavoriteItemPage(t.b.userId, "a-z", after);

    expect(idsOf(second.rows)).toEqual(
      expected.slice(FAVORITES_PAGE_SIZE, FAVORITES_PAGE_SIZE * 2),
    );
  });

  it("refuses a favorite with no date, and a date on a row that is not one", async () => {
    const { note, link } = t.a.items;

    await expect(
      prisma.item.update({ where: { id: note }, data: { favoritedAt: null } }),
    ).rejects.toThrow();
    await expect(
      prisma.item.update({
        where: { id: link },
        data: { favoritedAt: new Date() },
      }),
    ).rejects.toThrow();
  });
});
