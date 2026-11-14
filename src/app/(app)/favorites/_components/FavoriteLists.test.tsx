import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act, render, screen, waitFor, within } from "../../../../../test/intl";
import type { FavoriteItem, ItemListPage } from "@/features/items/types";

const { fetchFavoritePage, setItemFavorite, search } = vi.hoisted(() => ({
  fetchFavoritePage: vi.fn(),
  setItemFavorite: vi.fn(),
  search: { params: new URLSearchParams() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ bfcacheId: "bf-1", push: vi.fn() }),
  useSearchParams: () => search.params,
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/features/items/_internal/components/fetch-item-list-page", () => ({
  fetchFavoritePage,
  fetchPinnedPage: vi.fn(),
}));
vi.mock("@/features/items/_internal/components/fetch-item-detail", () => ({
  fetchItemDetail: vi.fn(),
  itemDetailQuery: (id: string) => ({
    queryKey: ["items", "detail", id],
    queryFn: vi.fn(),
  }),
}));
vi.mock("@/features/items/actions/item", () => ({
  deleteItem: vi.fn(),
  setItemFavorite,
  setItemPin: vi.fn(),
}));
vi.mock("@/features/collections/actions/collection", () => ({
  setCollectionFavorite: vi.fn(),
}));
vi.mock("@/features/items/_internal/components/ItemDrawerContent", () => ({
  ITEM_SHEET_CLASS: "",
  ItemDrawerContent: () => null,
}));

import { FavoriteLists } from "@/app/(app)/favorites/_components/FavoriteLists";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";

// jsdom has no IntersectionObserver; the sentinel never fires here, so every
// next page in these tests is asked for with the button.
class NoIntersection {
  observe() {}
  disconnect() {}
}

function favorite(n: number): FavoriteItem {
  return {
    id: `item-${n}`,
    title: `Item ${n}`,
    description: null,
    isFavorite: true,
    isPinned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    favoritedAt: new Date(Date.UTC(2026, 2, 1) - n * 60_000),
    tags: [],
    type: { id: "type-snippet", name: "snippet", icon: "Code" },
  };
}

function page(from: number, to: number, nextCursor: string | null) {
  const rows = Array.from({ length: to - from + 1 }, (_, i) =>
    favorite(from + i),
  );
  return { rows, nextCursor } satisfies ItemListPage<FavoriteItem>;
}

function setup(itemCount = 4) {
  render(
    <ItemDrawerProvider>
      <FavoriteLists
        first={{
          sort: "newest",
          page: page(1, 2, "c1"),
          renderedAt: Date.now(),
        }}
        itemCount={itemCount}
        collections={[]}
      />
    </ItemDrawerProvider>,
  );
  return userEvent.setup();
}

const rowTitles = () =>
  screen
    .queryAllByRole("button", { name: /^Item \d+/ })
    .map((row) => row.textContent);

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", NoIntersection);
  search.params = new URLSearchParams();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FavoriteLists", () => {
  it("shows the server's first page and loads the next with the button", async () => {
    fetchFavoritePage.mockResolvedValue(page(3, 4, null));
    const user = setup();

    expect(
      screen.getByRole("heading", { name: "Items (4)" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Favorite Item 4" }),
      ).toBeInTheDocument();
    });
    expect(fetchFavoritePage).toHaveBeenCalledWith(
      "newest",
      "c1",
      expect.any(AbortSignal),
    );
  });

  // The race the cache sync cancels first (ADR 0025): a page on its way when a
  // row is unstarred must not write the row back when it lands.
  it("keeps an unstarred row gone when a page that left before lands after", async () => {
    const pageTwo = Promise.withResolvers<ItemListPage<FavoriteItem>>();
    fetchFavoritePage.mockReturnValueOnce(pageTwo.promise);
    fetchFavoritePage.mockResolvedValue(page(3, 4, null));
    setItemFavorite.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });
    const user = setup();

    await user.click(screen.getByRole("button", { name: "Load more" }));
    await user.click(screen.getByRole("button", { name: "Favorite Item 1" }));
    await waitFor(() =>
      expect(setItemFavorite).toHaveBeenCalledWith("item-1", false),
    );
    await act(async () => pageTwo.resolve(page(1, 4, null)));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Favorite Item 1" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Favorite Item 2" }),
    ).toBeInTheDocument();
  });

  it("does not show the empty state while favorites remain to be loaded", async () => {
    setItemFavorite.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });
    const user = setup(4);

    await user.click(screen.getByRole("button", { name: "Favorite Item 1" }));
    await user.click(screen.getByRole("button", { name: "Favorite Item 2" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Favorite Item 2" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByText("No favorites yet.")).not.toBeInTheDocument();
    // The count the server gave stays until the action's refresh, which this
    // test has none of; the rows left to load are still offered.
    expect(screen.getByRole("heading", { name: /^Items/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();
  });

  it("keeps the rows of the old sort dimmed while the new sort's first page loads", async () => {
    const aToZ = Promise.withResolvers<ItemListPage<FavoriteItem>>();
    fetchFavoritePage.mockReturnValue(aToZ.promise);
    const { rerender } = render(<></>);
    search.params = new URLSearchParams("itemSort=a-z");
    rerender(
      <ItemDrawerProvider>
        <FavoriteLists
          first={{
            sort: "newest",
            page: page(1, 2, null),
            renderedAt: Date.now(),
          }}
          itemCount={2}
          collections={[]}
        />
      </ItemDrawerProvider>,
    );

    await waitFor(() =>
      expect(fetchFavoritePage).toHaveBeenCalledWith(
        "a-z",
        null,
        expect.any(AbortSignal),
      ),
    );
    expect(
      within(document.body).queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
    await act(async () => aToZ.resolve(page(7, 8, null)));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Favorite Item 7" }),
      ).toBeInTheDocument();
    });
  });

  it("shows the error with Try again when the first page of a sort fails", async () => {
    fetchFavoritePage.mockRejectedValue(new TypeError("Failed to fetch"));
    search.params = new URLSearchParams("itemSort=a-z");
    setup(2);

    expect(
      await screen.findByText(
        "Couldn't load the items.",
        {},
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    expect(rowTitles()).toEqual([]);
  });
});
