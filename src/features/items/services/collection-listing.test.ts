import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCollectionItemRecords, signFileUrls } = vi.hoisted(() => ({
  getCollectionItemRecords: vi.fn(),
  signFileUrls: vi.fn(),
}));
vi.mock("@/features/items/queries", () => ({ getCollectionItemRecords }));
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

describe("getUserCollectionListing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signFileUrls.mockImplementation(async (key: string) => ({
      viewUrl: `https://r2.example/view/${key}`,
      downloadUrl: `https://r2.example/download/${key}`,
    }));
  });

  it("lists each type the way its own page does", async () => {
    getCollectionItemRecords.mockResolvedValue([note, image, file]);

    const { sections } = await getUserCollectionListing("user-1", "col-1");

    expect(
      Object.fromEntries(sections.map((s) => [s.type.name, s.listing])),
    ).toEqual({ note: "cards", image: "gallery", file: "files" });
  });

  it("signs the uploads for the gallery and the file rows", async () => {
    getCollectionItemRecords.mockResolvedValue([image, file]);

    const { sections } = await getUserCollectionListing("user-1", "col-1");

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

  // Every section goes to client components.
  it("never hands out the object key, in any section", async () => {
    getCollectionItemRecords.mockResolvedValue([
      { ...note, fileKey: "users/user-1/stray" },
      image,
      file,
    ]);

    const listing = await getUserCollectionListing("user-1", "col-1");

    expect(JSON.stringify(listing)).not.toContain('"fileKey"');
  });

  it("counts every item, and an empty collection has no sections", async () => {
    getCollectionItemRecords.mockResolvedValue([note, image]);
    await expect(
      getUserCollectionListing("user-1", "col-1"),
    ).resolves.toMatchObject({ itemCount: 2 });

    getCollectionItemRecords.mockResolvedValue([]);
    await expect(getUserCollectionListing("user-1", "col-1")).resolves.toEqual({
      itemCount: 0,
      sections: [],
    });
  });
});
