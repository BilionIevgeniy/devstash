import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCollectionItemRecords,
  getCollectionTypeCounts,
  getEntitlements,
  signFileUrls,
} = vi.hoisted(() => ({
  getCollectionItemRecords: vi.fn(),
  getCollectionTypeCounts: vi.fn(),
  getEntitlements: vi.fn(),
  signFileUrls: vi.fn(),
}));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/features/items/_internal/queries", () => ({
  getCollectionItemRecords,
  getCollectionTypeCounts,
}));
vi.mock("@/features/files/services/objects", () => ({ signFileUrls }));

import { getUserCollectionListing } from "@/features/items/services/collection-listing";

const base = {
  title: "Item",
  description: null,
  isFavorite: false,
  isPinned: false,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  tags: [],
  canCopy: false,
  fileKey: null,
  fileName: null,
  fileSize: null,
};

const note = {
  ...base,
  id: "note-1",
  canCopy: true,
  type: { id: "t-note", name: "note", icon: "StickyNote" },
};
const image = {
  ...base,
  id: "image-1",
  fileKey: "users/user-1/a.png",
  fileName: "a.png",
  fileSize: 10,
  type: { id: "t-image", name: "image", icon: "Image" },
};
const file = {
  ...base,
  id: "file-1",
  fileKey: "users/user-1/a.pdf",
  fileName: "a.pdf",
  fileSize: 20,
  type: { id: "t-file", name: "file", icon: "File" },
};

// The collection holds exactly the given items.
function mockCollection<T extends { type: { id: string } }>(records: T[]) {
  const counts = new Map<string, number>();
  for (const { type } of records) {
    counts.set(type.id, (counts.get(type.id) ?? 0) + 1);
  }
  getCollectionTypeCounts.mockResolvedValue(counts);
  getCollectionItemRecords.mockResolvedValue(records);
}

describe("getUserCollectionListing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEntitlements.mockResolvedValue({ isPro: true });
    signFileUrls.mockImplementation(async (key: string) => ({
      viewUrl: `https://r2.example/view/${key}`,
      downloadUrl: `https://r2.example/download/${key}`,
    }));
  });

  it("lists each type the way its own page does", async () => {
    mockCollection([note, image, file]);

    const { sections } = await getUserCollectionListing("user-1", "col-1", 1);

    expect(
      Object.fromEntries(sections.map((s) => [s.type.name, s.listing])),
    ).toEqual({ note: "cards", image: "gallery", file: "files" });
  });

  it("signs the uploads for the gallery and the file rows", async () => {
    mockCollection([image, file]);

    const { sections } = await getUserCollectionListing("user-1", "col-1", 1);

    expect(sections.find((s) => s.listing === "gallery")?.items[0]).toEqual(
      expect.objectContaining({
        imageUrl: "https://r2.example/view/users/user-1/a.png",
      }),
    );
    expect(sections.find((s) => s.listing === "files")?.items[0]).toEqual(
      expect.objectContaining({
        file: expect.objectContaining({ name: "a.pdf", size: 20 }),
      }),
    );
  });

  it("signs nothing for a Free user, who keeps the rows", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });
    mockCollection([image, file]);

    const { sections } = await getUserCollectionListing("user-1", "col-1", 1);

    expect(signFileUrls).not.toHaveBeenCalled();
    expect(sections.find((s) => s.listing === "gallery")?.items[0]).toEqual(
      expect.objectContaining({ id: "image-1", imageUrl: null }),
    );
    expect(sections.find((s) => s.listing === "files")?.items[0]).toEqual(
      expect.objectContaining({ id: "file-1", file: null }),
    );
  });

  // Every section goes to client components.
  it("never hands out the object key, in any section", async () => {
    mockCollection([{ ...note, fileKey: "users/user-1/stray" }, image, file]);

    const listing = await getUserCollectionListing("user-1", "col-1", 1);

    expect(JSON.stringify(listing)).not.toContain('"fileKey"');
  });

  it("counts every item, and an empty collection has no sections", async () => {
    mockCollection([note, image]);
    await expect(
      getUserCollectionListing("user-1", "col-1", 1),
    ).resolves.toMatchObject({ itemCount: 2 });

    mockCollection([]);
    await expect(
      getUserCollectionListing("user-1", "col-1", 1),
    ).resolves.toEqual({
      itemCount: 0,
      page: 1,
      totalPages: 1,
      sections: [],
    });
  });

  it("reads only the rows of the page, past the end the last one", async () => {
    getCollectionTypeCounts.mockResolvedValue(new Map([["t-note", 30]]));
    getCollectionItemRecords.mockResolvedValue([note]);

    const listing = await getUserCollectionListing("user-1", "col-1", 9);

    expect(getCollectionItemRecords).toHaveBeenCalledWith(
      "user-1",
      "col-1",
      21,
      21,
    );
    expect(listing).toMatchObject({ itemCount: 30, page: 2, totalPages: 2 });
  });

  // A page can hold more of a type that is smaller in the whole collection.
  it("orders and labels the sections by the whole collection", async () => {
    getCollectionTypeCounts.mockResolvedValue(
      new Map([
        ["t-image", 30],
        ["t-note", 15],
      ]),
    );
    getCollectionItemRecords.mockResolvedValue([
      note,
      { ...note, id: "note-2" },
      image,
    ]);

    const { sections } = await getUserCollectionListing("user-1", "col-1", 2);

    expect(sections.map((s) => [s.type.name, s.totalCount])).toEqual([
      ["image", 30],
      ["note", 15],
    ]);
  });

  it("counts the page's items for a type created between the reads", async () => {
    getCollectionTypeCounts.mockResolvedValue(new Map());
    getCollectionItemRecords.mockResolvedValue([note]);

    const { sections } = await getUserCollectionListing("user-1", "col-1", 1);

    expect(sections[0].totalCount).toBe(1);
  });
});
