import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, findTypes } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findTypes: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: { collection: { findMany }, itemType: { findMany: findTypes } },
}));

import { getSidebarCollections } from "@/features/collections/queries/sidebar";

describe("getSidebarCollections", () => {
  const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `col-${index}`,
      name: "React",
      description: null,
      isFavorite: true,
      _count: { items: 0 },
      items: [],
    }));

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    findTypes.mockReset().mockResolvedValue([]);
  });

  it("reads one row past the limit of the caller's two groups", async () => {
    await getSidebarCollections("user-1");

    const [favorites, recent] = findMany.mock.calls.map(([args]) => args);
    expect(favorites.where).toEqual({ userId: "user-1", isFavorite: true });
    expect(recent.where).toEqual({ userId: "user-1" });
    expect(favorites.take).toBe(6);
    expect(recent.take).toBe(6);
  });

  // A star leaves updatedAt alone: by that order a new favorite of an old
  // collection would fall past the limit and never show.
  it("orders favorites by the star and recent by the last change", async () => {
    await getSidebarCollections("user-1");

    const [favorites, recent] = findMany.mock.calls.map(([args]) => args);
    expect(favorites.orderBy).toEqual([
      { favoritedAt: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ]);
    expect(recent.orderBy).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
  });

  it("reports each group's overflow on its own", async () => {
    findMany.mockResolvedValueOnce(rows(6)).mockResolvedValueOnce(rows(5));

    const result = await getSidebarCollections("user-1");

    expect(result.favorites).toHaveLength(5);
    expect(result.hasMoreFavorites).toBe(true);
    expect(result.recent).toHaveLength(5);
    expect(result.hasMoreRecent).toBe(false);
  });
});
