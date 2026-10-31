import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUploadItemsByType, signFileUrls } = vi.hoisted(() => ({
  getUploadItemsByType: vi.fn(),
  signFileUrls: vi.fn(),
}));
vi.mock("@/features/items/queries", () => ({ getUploadItemsByType }));
vi.mock("@/features/files/services/objects", () => ({ signFileUrls }));

import { getUserFileListItems } from "@/features/items/services/file-list";

const record = {
  id: "item-1",
  title: "Q3 AWS bill",
  description: null,
  isFavorite: false,
  isPinned: false,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  tags: [],
  type: { id: "type-1", name: "file", icon: "File", color: "#6b7280" },
  fileKey: null,
  fileName: null,
  fileSize: null,
};

describe("getUserFileListItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signFileUrls.mockImplementation(async (key: string) => ({
      viewUrl: `https://r2.example/view/${key}`,
      downloadUrl: `https://r2.example/download/${key}`,
    }));
  });

  it("signs nothing for an item without a file", async () => {
    getUploadItemsByType.mockResolvedValue([record]);

    const [item] = await getUserFileListItems("user-1", "type-1");

    expect(item.file).toBeNull();
    expect(signFileUrls).not.toHaveBeenCalled();
  });

  it("hands out the name, size and download URL but never the key", async () => {
    getUploadItemsByType.mockResolvedValue([
      {
        ...record,
        fileKey: "users/user-1/a.csv",
        fileName: "export(3).csv",
        fileSize: 2048,
      },
    ]);

    const [item] = await getUserFileListItems("user-1", "type-1");

    expect(item.file).toMatchObject({
      name: "export(3).csv",
      size: 2048,
      downloadUrl: "https://r2.example/download/users/user-1/a.csv",
    });
    expect(item).not.toHaveProperty("fileKey");
    expect(JSON.stringify(item)).not.toContain('"users/user-1/a.csv"');
  });

  // The drawer signs with the same name, so the file is saved under the same
  // name from the list and from the drawer.
  it("signs a file without a name under its key, like the item detail", async () => {
    getUploadItemsByType.mockResolvedValue([
      { ...record, fileKey: "users/user-1/a.csv" },
    ]);

    await getUserFileListItems("user-1", "type-1");

    expect(signFileUrls).toHaveBeenCalledWith(
      "users/user-1/a.csv",
      "users/user-1/a.csv",
      expect.any(Date),
    );
  });

  it("keeps the order of the query", async () => {
    getUploadItemsByType.mockResolvedValue([
      { ...record, id: "b", fileKey: "users/user-1/b.csv" },
      { ...record, id: "a" },
    ]);

    const items = await getUserFileListItems("user-1", "type-1");

    expect(items.map(({ id }) => id)).toEqual(["b", "a"]);
  });
});
