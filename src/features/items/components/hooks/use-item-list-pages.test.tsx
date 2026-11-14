import { describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "../../../../../test/intl";
import { createQueryClient } from "@/components/common/query-client";
import type { FavoriteItem, FirstListPage } from "@/features/items/types";

const { fetchFavoritePage, router } = vi.hoisted(() => ({
  fetchFavoritePage: vi.fn(),
  router: { bfcacheId: "bf-1" },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/items/_internal/components/fetch-item-list-page", () => ({
  fetchFavoritePage,
  fetchPinnedPage: vi.fn(),
}));

import { useFavoritePages } from "@/features/items/components/hooks/use-item-list-pages";

function favorite(id: string): FavoriteItem {
  return {
    id,
    title: id,
    description: null,
    isFavorite: true,
    isPinned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    favoritedAt: new Date("2026-03-01T00:00:00Z"),
    tags: [],
    type: { id: "t", name: "snippet", icon: "Code" },
  };
}

function first(ids: string[]): FirstListPage<FavoriteItem> {
  return {
    sort: "newest",
    page: { rows: ids.map(favorite), nextCursor: "c1" },
    renderedAt: Date.now(),
  };
}

const ids = (rows: FavoriteItem[]) => rows.map((row) => row.id);

describe("useFavoritePages", () => {
  // The bfcacheId in the key (ADR 0025): Back finds every page loaded before,
  // a fresh navigation starts from the server's page.
  it("keeps the loaded pages for the same segment and starts over for a fresh one", async () => {
    fetchFavoritePage.mockResolvedValue({
      rows: [favorite("b")],
      nextCursor: null,
    });
    const queryClient = createQueryClient();
    const { result, unmount } = renderHook(
      () => useFavoritePages("newest", first(["a"])),
      { queryClient },
    );
    act(() => result.current.loadMore());
    await waitFor(() => expect(ids(result.current.rows)).toEqual(["a", "b"]));
    unmount();

    const back = renderHook(() => useFavoritePages("newest", first(["a"])), {
      queryClient,
    });
    expect(ids(back.result.current.rows)).toEqual(["a", "b"]);
    back.unmount();

    router.bfcacheId = "bf-2";
    const fresh = renderHook(() => useFavoritePages("newest", first(["z"])), {
      queryClient,
    });
    expect(ids(fresh.result.current.rows)).toEqual(["z"]);
    router.bfcacheId = "bf-1";
  });

  // A next page asked for during a refetch would join it and fetch nothing,
  // so the button shows that the list is busy.
  it("is busy while the loaded pages are refetched", async () => {
    const refetch = Promise.withResolvers<{
      rows: FavoriteItem[];
      nextCursor: string | null;
    }>();
    fetchFavoritePage.mockReturnValue(refetch.promise);
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useFavoritePages("newest", first(["a"])),
      { queryClient },
    );
    expect(result.current.isLoadingMore).toBe(false);

    act(() => {
      void queryClient.invalidateQueries({ queryKey: ["items", "lists"] });
    });

    await waitFor(() => expect(result.current.isLoadingMore).toBe(true));
    await act(async () =>
      refetch.resolve({ rows: [favorite("a")], nextCursor: null }),
    );
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
  });
});
