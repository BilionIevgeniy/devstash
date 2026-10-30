import { describe, expect, it } from "vitest";
import { toItemDetailJson } from "@/features/items/domain/item-detail";
import type { ItemDetail } from "@/features/items/types";

const detail: ItemDetail = {
  id: "item-1",
  title: "useDebounce",
  description: null,
  isFavorite: false,
  isPinned: true,
  createdAt: new Date("2026-10-01T08:30:00.000Z"),
  updatedAt: new Date("2026-10-02T09:45:00.000Z"),
  tags: ["react", "hooks"],
  type: { id: "type-1", name: "snippet", icon: "Code", color: "#3b82f6" },
  contentType: "text",
  content: "const x = 1;",
  url: null,
  fileUrl: null,
  fileName: null,
  fileSize: null,
  language: "typescript",
  collections: [{ id: "col-1", name: "React Patterns" }],
};

describe("toItemDetailJson", () => {
  it("turns the dates into ISO strings and keeps every other field", () => {
    const { createdAt, updatedAt, ...rest } = detail;

    expect(toItemDetailJson(detail)).toEqual({
      ...rest,
      createdAt: "2026-10-01T08:30:00.000Z",
      updatedAt: "2026-10-02T09:45:00.000Z",
    });
    expect(createdAt).toBeInstanceOf(Date);
    expect(updatedAt).toBeInstanceOf(Date);
  });
});
