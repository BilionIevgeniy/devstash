import { beforeEach, describe, expect, it, vi } from "vitest";

const { getItemDetail, getItemDetailOfType, signFileUrls } = vi.hoisted(() => ({
  getItemDetail: vi.fn(),
  getItemDetailOfType: vi.fn(),
  signFileUrls: vi.fn(),
}));
vi.mock("@/features/items/queries", () => ({
  getItemDetail,
  getItemDetailOfType,
}));
vi.mock("@/features/files/services/objects", () => ({ signFileUrls }));

import {
  getUserItemDetail,
  getUserItemDetailOfType,
} from "@/features/items/services/item-detail";

const record = {
  id: "item-1",
  title: "Cat",
  description: null,
  isFavorite: false,
  isPinned: false,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  updatedAt: new Date("2026-01-15T00:00:00Z"),
  tags: [],
  type: { id: "type-1", name: "image", icon: "Image", color: "#ec4899" },
  contentType: "FILE",
  content: null,
  url: null,
  language: null,
  collections: [],
  fileKey: null,
  fileName: null,
  fileSize: null,
};

describe("getUserItemDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signFileUrls.mockResolvedValue({
      viewUrl: "https://r2.example/view",
      downloadUrl: "https://r2.example/download",
    });
  });

  it("signs nothing for an item without a file", async () => {
    getItemDetail.mockResolvedValue(record);

    const detail = await getUserItemDetail("user-1", "item-1");

    expect(detail?.file).toBeNull();
    expect(signFileUrls).not.toHaveBeenCalled();
  });

  it("turns the key into signed URLs and never hands the key out", async () => {
    getItemDetail.mockResolvedValue({
      ...record,
      fileKey: "users/user-1/abc.png",
      fileName: "cat.png",
      fileSize: 4096,
    });

    const detail = await getUserItemDetail("user-1", "item-1");

    expect(signFileUrls).toHaveBeenCalledWith(
      "users/user-1/abc.png",
      "cat.png",
      expect.any(Date),
    );
    expect(detail?.file).toEqual({
      name: "cat.png",
      size: 4096,
      viewUrl: "https://r2.example/view",
      downloadUrl: "https://r2.example/download",
    });
    expect(detail).not.toHaveProperty("fileKey");
  });

  it("answers null for a missing item", async () => {
    getItemDetail.mockResolvedValue(null);

    expect(await getUserItemDetail("user-1", "item-1")).toBeNull();
  });
});

describe("getUserItemDetailOfType", () => {
  it("reads through the typed query", async () => {
    getItemDetailOfType.mockResolvedValue(null);

    await getUserItemDetailOfType("user-1", "item-1", "image");

    expect(getItemDetailOfType).toHaveBeenCalledWith(
      "user-1",
      "item-1",
      "image",
    );
  });
});
