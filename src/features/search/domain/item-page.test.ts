import { describe, expect, it } from "vitest";

import { isItemPage } from "@/features/search/domain/item-page";

const item = { id: "abc", type: { name: "snippet" } };

describe("isItemPage", () => {
  it("recognises the item's own page", () => {
    expect(isItemPage("/items/snippets/abc", item)).toBe(true);
  });

  it("is false on another item's page", () => {
    expect(isItemPage("/items/snippets/xyz", item)).toBe(false);
  });

  it("is false on the same id under another type", () => {
    expect(isItemPage("/items/notes/abc", item)).toBe(false);
  });

  it("is false on the pages where a drawer is safe", () => {
    expect(isItemPage("/dashboard", item)).toBe(false);
    expect(isItemPage("/items/snippets", item)).toBe(false);
  });
});
