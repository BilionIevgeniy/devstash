import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getEntitlements: vi.fn(),
  getRecentSearchableItems: vi.fn(),
  getRecentSearchableCollections: vi.fn(),
  searchUserItems: vi.fn(),
  searchUserCollections: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));
vi.mock("@/features/billing/queries", () => ({
  getEntitlements: mocks.getEntitlements,
}));
vi.mock("@/features/items/queries/search", () => ({
  getRecentSearchableItems: mocks.getRecentSearchableItems,
  searchUserItems: mocks.searchUserItems,
}));
vi.mock("@/features/collections/queries/search", () => ({
  getRecentSearchableCollections: mocks.getRecentSearchableCollections,
  searchUserCollections: mocks.searchUserCollections,
}));

import { searchPalette } from "@/features/search/services/search";

const item = (id: string, typeName: string) => ({
  id,
  title: id,
  description: null,
  isFavorite: false,
  isPinned: false,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  type: { id: `type-${typeName}`, name: typeName, icon: "File", color: null },
  tags: [],
  preview: null,
});
const collection = { id: "col-1", name: "React", itemCount: 2 };
const signal = () => new AbortController().signal;

beforeEach(() => {
  mocks.consumeRateLimit.mockResolvedValue({
    success: true,
    remaining: 10,
    reset: 0,
  });
  mocks.getEntitlements.mockResolvedValue({ isPro: false });
  mocks.getRecentSearchableItems.mockResolvedValue([item("recent", "note")]);
  mocks.getRecentSearchableCollections.mockResolvedValue([collection]);
  mocks.searchUserItems.mockResolvedValue({
    items: [item("match", "snippet"), item("upload", "file")],
    nextOffset: 20,
  });
  mocks.searchUserCollections.mockResolvedValue([collection]);
});

describe("searchPalette", () => {
  it("refuses over the limit before reading anything", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 1234,
    });

    await expect(
      searchPalette("user-1", { q: "react", cursor: 0 }, signal()),
    ).resolves.toEqual({ status: "rate-limited", reset: 1234 });
    expect(mocks.consumeRateLimit.mock.calls[0][1]).toBe("user-1");
    expect(mocks.searchUserItems).not.toHaveBeenCalled();
  });

  it("answers an empty text with the recent list and no search", async () => {
    const result = await searchPalette(
      "user-1",
      { q: "", cursor: 0 },
      signal(),
    );

    expect(result).toMatchObject({
      status: "ok",
      results: { collections: [collection], nextCursor: null },
    });
    expect(mocks.searchUserItems).not.toHaveBeenCalled();
    expect(mocks.searchUserCollections).not.toHaveBeenCalled();
  });

  it("locks the uploads of a Free user and hands on the next cursor", async () => {
    const result = await searchPalette(
      "user-1",
      { q: "react", cursor: 0 },
      signal(),
    );

    if (result.status !== "ok") throw new Error("expected results");
    expect(
      result.results.items.map(({ id, isLocked }) => ({ id, isLocked })),
    ).toEqual([
      { id: "match", isLocked: false },
      { id: "upload", isLocked: true },
    ]);
    expect(result.results.nextCursor).toBe("20");
    expect(mocks.searchUserItems).toHaveBeenCalledWith("user-1", "react", 0);
  });

  it("offers no cursor past the deepest page the route takes", async () => {
    mocks.searchUserItems.mockResolvedValue({ items: [], nextOffset: 1_020 });

    const result = await searchPalette(
      "user-1",
      { q: "re", cursor: 1_000 },
      signal(),
    );

    expect(result).toMatchObject({ results: { nextCursor: null } });
  });

  it("reads the collections with the first page only", async () => {
    const result = await searchPalette(
      "user-1",
      { q: "react", cursor: 20 },
      signal(),
    );

    expect(result).toMatchObject({ results: { collections: [] } });
    expect(mocks.searchUserCollections).not.toHaveBeenCalled();
  });

  it("reads nothing once the request is aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      searchPalette("user-1", { q: "react", cursor: 0 }, controller.signal),
    ).rejects.toThrow();
    expect(mocks.searchUserItems).not.toHaveBeenCalled();
  });
});
