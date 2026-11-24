import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({ prisma: { item: { findMany } } }));

import { getSidebarItems } from "@/features/items/queries/sidebar";

describe("getSidebarItems", () => {
  const type = { id: "type-1", name: "note", icon: "StickyNote", color: null };
  const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `item-${index}`,
      title: "note",
      type,
    }));

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("reads one row past the limit of the caller's two groups", async () => {
    await getSidebarItems("user-1");

    const [favorites, pinned] = findMany.mock.calls.map(([args]) => args);
    expect(favorites.where).toEqual({ userId: "user-1", isFavorite: true });
    expect(pinned.where).toEqual({ userId: "user-1", isPinned: true });
    expect(favorites.take).toBe(6);
    expect(pinned.take).toBe(6);
  });

  it("reports more pins and shows only the limit", async () => {
    findMany.mockResolvedValueOnce(rows(5)).mockResolvedValueOnce(rows(6));

    const result = await getSidebarItems("user-1");

    expect(result.favorites).toHaveLength(5);
    expect(result.hasMoreFavorites).toBe(false);
    expect(result.pinned).toHaveLength(5);
    expect(result.hasMorePinned).toBe(true);
  });
});
