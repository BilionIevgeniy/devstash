import { beforeEach, describe, expect, it, vi } from "vitest";

const { countFileItems, getEntitlements, getFileItemRecords, signFileUrls } =
  vi.hoisted(() => ({
    countFileItems: vi.fn(),
    getEntitlements: vi.fn(),
    getFileItemRecords: vi.fn(),
    signFileUrls: vi.fn(),
  }));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/features/items/_internal/queries", () => ({
  countFileItems,
  getFileItemRecords,
}));
vi.mock("@/features/files/services/objects", () => ({ signFileUrls }));

import {
  getUserLockedFileCount,
  getUserLockedFiles,
} from "@/features/items/services/locked-files";

const record = {
  id: "item-1",
  title: "Report",
  fileKey: "users/user-1/a.pdf",
  fileName: "a.pdf",
  fileSize: 2048,
};

describe("getUserLockedFileCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countFileItems.mockResolvedValue(3);
  });

  it("counts the files of a Free user", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(getUserLockedFileCount("user-1")).resolves.toBe(3);
  });

  it("is 0 on Pro, whose uploads are not locked", async () => {
    getEntitlements.mockResolvedValue({ isPro: true });

    await expect(getUserLockedFileCount("user-1")).resolves.toBe(0);
    expect(countFileItems).not.toHaveBeenCalled();
  });
});

describe("getUserLockedFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFileItemRecords.mockResolvedValue({
      items: [record],
      totalCount: 1,
      page: 1,
      totalPages: 1,
    });
    signFileUrls.mockResolvedValue({
      viewUrl: "https://r2.example/view",
      downloadUrl: "https://r2.example/download",
    });
  });

  it("gives a Free user a download and nothing to view with", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    const { items } = await getUserLockedFiles("user-1", 1);

    expect(items).toEqual([
      {
        id: "item-1",
        title: "Report",
        fileName: "a.pdf",
        size: 2048,
        downloadUrl: "https://r2.example/download",
      },
    ]);
    expect(JSON.stringify(items)).not.toContain("fileKey");
  });

  it("reads and signs nothing on Pro", async () => {
    getEntitlements.mockResolvedValue({ isPro: true });

    const { items, totalCount } = await getUserLockedFiles("user-1", 1);

    expect(items).toEqual([]);
    expect(totalCount).toBe(0);
    expect(getFileItemRecords).not.toHaveBeenCalled();
    expect(signFileUrls).not.toHaveBeenCalled();
  });
});
