import { beforeAll, describe, expect, it } from "vitest";
import {
  createItem,
  idsOf,
  seedTenants,
  systemTypeId,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { SEARCH_PAGE_SIZE } from "@/features/items/domain/search-text";
import { searchUserItems } from "@/features/items/queries/search";
import { prisma } from "@/lib/prisma";

// Read-only: one seed for the file. A and B have the same titles, so a search
// that leaked across users would find two rows instead of one.
let t: Tenants;
let extra: Record<
  "logLine" | "reactLink" | "zebraTitle" | "zebraContent" | "cyrillic",
  string
>;

const BULK_COUNT = 1500;

// The acceptance case of the spec: far more items than the old index held.
// createMany on purpose: 1500 creates through the service would take minutes,
// and the plan limit of A does not matter to a read.
async function seedBulkItems(userId: string): Promise<void> {
  const typeId = await systemTypeId("note");
  await prisma.item.createMany({
    data: Array.from({ length: BULK_COUNT }, (_, i) => ({
      userId,
      typeId,
      contentType: "TEXT",
      title: `Bulk item ${i + 1}`,
      content: `npm run task${i + 1}`,
      // The oldest edits first, so item 1500 would be the last of any index.
      updatedAt: new Date(Date.UTC(2020, 0, 1) - i * 60_000),
    })),
  });
}

beforeAll(async () => {
  t = await seedTenants();
  const note = (title: string, content: string) =>
    createItem(t.a.userId, { typeName: "note", title, content });
  extra = {
    logLine: await note("Debug tips", "console.log(x) in next.config.ts"),
    reactLink: await createItem(t.a.userId, {
      typeName: "link",
      title: "Learn",
      url: "https://react.dev/learn",
    }),
    zebraTitle: await note("Zebra", "stripes"),
    zebraContent: await note("Animals", "a zebra has stripes"),
    cyrillic: await note("Нотатки", "Привіт, світе: налаштування сервера"),
  };
  // Last: A is on the Free plan, so the creates above must come first.
  await seedBulkItems(t.a.userId);
}, 60_000);

const find = async (userId: string, text: string) =>
  idsOf((await searchUserItems(userId, text, 0)).items);

describe("searchUserItems", () => {
  it("finds item 1500 by its title and by a word of its content", async () => {
    const [byTitle] = await find(t.a.userId, "Bulk item 1500");
    const [byContent] = await find(t.a.userId, "task1500");
    const { title } = await prisma.item.findUniqueOrThrow({
      where: { id: byContent },
      select: { title: true },
    });
    expect(title).toBe("Bulk item 1500");
    expect(byTitle).toBe(byContent);
  });

  it("finds words inside code, file names and URLs", async () => {
    expect(await find(t.a.userId, "console")).toEqual([extra.logLine]);
    expect(await find(t.a.userId, "console.log")).toEqual([extra.logLine]);
    expect(await find(t.a.userId, "config")).toEqual([extra.logLine]);
    expect(await find(t.a.userId, "react.dev")).toEqual([extra.reactLink]);
  });

  // The index splits on [^[:alnum:]], which follows the database's ctype: a
  // plain C ctype would drop every non-Latin letter.
  it("finds words of a non-Latin script", async () => {
    expect(await find(t.a.userId, "налашт")).toEqual([extra.cyrillic]);
    expect(await find(t.a.userId, "Привіт")).toEqual([extra.cyrillic]);
  });

  it("finds an item by a tag, by a prefix and by a typo in the title", async () => {
    expect((await find(t.a.userId, "shared")).sort()).toEqual(
      [t.a.items.snippet, t.a.items.note].sort(),
    );
    expect(await find(t.a.userId, "useDeb")).toEqual([t.a.items.snippet]);
    expect(await find(t.a.userId, "Meetng notes")).toContain(t.a.items.note);
  });

  it("ranks a match in the title above one in the content", async () => {
    expect(await find(t.a.userId, "zebra")).toEqual([
      extra.zebraTitle,
      extra.zebraContent,
    ]);
  });

  it("pages through the matches without overlap", async () => {
    const first = await searchUserItems(t.a.userId, "bulk", 0);
    expect(first.items).toHaveLength(SEARCH_PAGE_SIZE);
    expect(first.nextOffset).toBe(SEARCH_PAGE_SIZE);

    const second = await searchUserItems(t.a.userId, "bulk", SEARCH_PAGE_SIZE);
    const overlap = idsOf(second.items).filter((id) =>
      idsOf(first.items).includes(id),
    );
    expect(second.items).toHaveLength(SEARCH_PAGE_SIZE);
    expect(overlap).toEqual([]);
  });

  it("finds only the caller's items", async () => {
    expect(await find(t.b.userId, "useDebounce")).toEqual([t.b.items.snippet]);
    expect(await find(t.a.userId, "useDebounce")).toEqual([t.a.items.snippet]);
    expect(await find(t.b.userId, "task1500")).toEqual([]);
    expect(await find(t.b.userId, "console")).toEqual([]);
  });
});
