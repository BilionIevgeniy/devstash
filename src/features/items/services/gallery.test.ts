import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUploadItemsByType, signFileUrls } = vi.hoisted(() => ({
  getUploadItemsByType: vi.fn(),
  signFileUrls: vi.fn(),
}));
vi.mock("@/features/items/queries", () => ({ getUploadItemsByType }));
vi.mock("@/features/files/services/objects", () => ({ signFileUrls }));

import { getUserGalleryItems } from "@/features/items/services/gallery";

const record = {
  id: "item-1",
  title: "Cat",
  description: null,
  isFavorite: false,
  isPinned: false,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  tags: [],
  type: { id: "type-1", name: "image", icon: "Image", color: "#ec4899" },
  fileKey: null,
  fileName: null,
  fileSize: null,
};

describe("getUserGalleryItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signFileUrls.mockImplementation(async (key: string) => ({
      viewUrl: `https://r2.example/view/${key}`,
      downloadUrl: `https://r2.example/download/${key}`,
    }));
  });

  it("signs nothing for an item without a file", async () => {
    getUploadItemsByType.mockResolvedValue([record]);

    const [item] = await getUserGalleryItems("user-1", "type-1");

    expect(item.imageUrl).toBeNull();
    expect(signFileUrls).not.toHaveBeenCalled();
  });

  it("hands out the view URL and never the key or the file name", async () => {
    getUploadItemsByType.mockResolvedValue([
      { ...record, fileKey: "users/user-1/a.png", fileName: "cat.png" },
    ]);

    const [item] = await getUserGalleryItems("user-1", "type-1");

    expect(item.imageUrl).toBe("https://r2.example/view/users/user-1/a.png");
    expect(item).not.toHaveProperty("fileKey");
    expect(item).not.toHaveProperty("fileName");
  });

  // The drawer signs with the same name, so both URLs match and the browser
  // loads the image once.
  it("signs a file without a name under its key, like the item detail", async () => {
    getUploadItemsByType.mockResolvedValue([
      { ...record, fileKey: "users/user-1/a.png" },
    ]);

    await getUserGalleryItems("user-1", "type-1");

    expect(signFileUrls).toHaveBeenCalledWith(
      "users/user-1/a.png",
      "users/user-1/a.png",
      expect.any(Date),
    );
  });

  it("keeps the order of the query", async () => {
    getUploadItemsByType.mockResolvedValue([
      { ...record, id: "b", fileKey: "users/user-1/b.png" },
      { ...record, id: "a" },
    ]);

    const items = await getUserGalleryItems("user-1", "type-1");

    expect(items.map(({ id }) => id)).toEqual(["b", "a"]);
  });
});
