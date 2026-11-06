import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEntitlements, getSearchableCollections, getSearchableItems } =
  vi.hoisted(() => ({
    getEntitlements: vi.fn(),
    getSearchableCollections: vi.fn(),
    getSearchableItems: vi.fn(),
  }));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/features/collections/queries", () => ({ getSearchableCollections }));
vi.mock("@/features/items/queries", () => ({ getSearchableItems }));

import { getSearchIndex } from "@/features/search/services/search-index";

const file = { id: "file-1", type: { name: "file" } };
const snippet = { id: "snippet-1", type: { name: "snippet" } };

describe("getSearchIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSearchableItems.mockResolvedValue([file, snippet]);
    getSearchableCollections.mockResolvedValue([]);
  });

  it("locks only the file items of a Free user", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    const { items } = await getSearchIndex("user-1");

    expect(items.map(({ id, isLocked }) => [id, isLocked])).toEqual([
      ["file-1", true],
      ["snippet-1", false],
    ]);
  });

  it("locks nothing on Pro", async () => {
    getEntitlements.mockResolvedValue({ isPro: true });

    const { items } = await getSearchIndex("user-1");

    expect(items.every(({ isLocked }) => !isLocked)).toBe(true);
  });
});
