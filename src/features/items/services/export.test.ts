import { beforeEach, describe, expect, it, vi } from "vitest";

const { getExportItemRows, getEntitlements, signItemFile } = vi.hoisted(() => ({
  getExportItemRows: vi.fn(),
  getEntitlements: vi.fn(),
  signItemFile: vi.fn(),
}));
vi.mock("@/features/items/_internal/queries/export", () => ({
  getExportItemRows,
}));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/features/items/_internal/services/file-urls", () => ({
  signItemFile,
}));

import { getUserExportItemPage } from "@/features/items/services/export";

const NOW = new Date("2026-11-12T10:30:00Z");
const row = {
  id: "i1",
  type: "file",
  title: "Spec",
  description: null,
  content: null,
  url: null,
  language: null,
  isFavorite: false,
  isPinned: false,
  createdAt: NOW,
  updatedAt: NOW,
  tags: [],
  collectionIds: [],
  fileKey: "users/user-1/spec.pdf",
  fileName: "spec.pdf",
  fileSize: 1024,
};

describe("getUserExportItemPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getExportItemRows.mockResolvedValue({ rows: [row], nextCursor: "i1" });
    signItemFile.mockResolvedValue({
      name: "spec.pdf",
      viewUrl: "view",
      downloadUrl: "download",
    });
  });

  it("signs a Pro user's file with the export's now and drops the key", async () => {
    getEntitlements.mockResolvedValue({ isPro: true });

    const page = await getUserExportItemPage("user-1", null, NOW);

    expect(page.nextCursor).toBe("i1");
    expect(page.items[0].file).toEqual({
      name: "spec.pdf",
      size: 1024,
      downloadUrl: "download",
    });
    expect(page.items[0]).not.toHaveProperty("fileKey");
    expect(signItemFile).toHaveBeenCalledWith(row.fileKey, "spec.pdf", NOW);
  });

  it("signs nothing for a plan that does not give the file", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    const page = await getUserExportItemPage("user-1", null, NOW);

    expect(page.items[0].file).toEqual({
      name: "spec.pdf",
      size: 1024,
      downloadUrl: null,
    });
    expect(signItemFile).not.toHaveBeenCalled();
  });
});
