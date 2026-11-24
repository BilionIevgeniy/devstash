import { describe, expect, it } from "vitest";

import { toRowFields } from "@/features/items/domain/row-fields";
import type { DashboardItem, UploadItemRecord } from "@/features/items/types";

const ROW: DashboardItem = {
  id: "item-1",
  title: "Cat",
  description: "A cat",
  descriptionAiGenerated: true,
  isFavorite: true,
  isPinned: true,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  tags: ["pets"],
  aiTags: ["pets"],
  type: { id: "type-1", name: "image", slug: "images", icon: "Image" },
};

describe("toRowFields", () => {
  it("keeps every field of a row and leaves the upload behind", () => {
    const record: UploadItemRecord = {
      ...ROW,
      fileKey: "users/user-1/a.png",
      fileName: "a.png",
      fileSize: 10,
    };

    expect(toRowFields(record)).toEqual(ROW);
  });
});
