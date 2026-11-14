import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "../../../../../test/intl";
import type { DashboardItem, PinnedGroupPage } from "@/features/items/types";

const fetchPinnedPage = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ bfcacheId: "bf-1", push: vi.fn() }),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/features/items/_internal/components/fetch-item-list-page", () => ({
  fetchFavoritePage: vi.fn(),
  fetchPinnedPage,
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
  setItemFavorite: vi.fn(),
  setItemPin: vi.fn(),
}));
vi.mock("@/features/items/_internal/components/ItemDrawerContent", () => ({
  ITEM_SHEET_CLASS: "",
  ItemDrawerContent: () => null,
}));

import { PinnedGroup } from "@/app/(app)/pinned/_components/PinnedGroup";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";

const TYPE = { id: "type-note", name: "note", icon: "StickyNote" };

function pin(n: number): DashboardItem {
  return {
    id: `note-${n}`,
    title: `Note ${n}`,
    description: null,
    isFavorite: false,
    isPinned: true,
    createdAt: new Date(Date.UTC(2026, 0, 1) - n * 60_000),
    tags: [],
    type: TYPE,
  };
}

const GROUP: PinnedGroupPage = {
  type: TYPE,
  count: 3,
  first: {
    sort: "newest",
    page: { rows: [pin(1), pin(2)], nextCursor: "c1" },
    renderedAt: Date.now(),
  },
};

function setup(isOpen: boolean) {
  render(
    <ItemDrawerProvider>
      <PinnedGroup
        group={GROUP}
        sort="newest"
        isOpen={isOpen}
        onToggle={vi.fn()}
      />
    </ItemDrawerProvider>,
  );
  return userEvent.setup();
}

describe("PinnedGroup", () => {
  it("shows the type's count and loads the next page of that type only", async () => {
    fetchPinnedPage.mockResolvedValue({ rows: [pin(3)], nextCursor: null });
    const user = setup(true);

    expect(
      screen.getByRole("button", { name: /Notes \(3\)/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show more" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Pin Note 3" }),
      ).toBeInTheDocument();
    });
    expect(fetchPinnedPage).toHaveBeenCalledExactlyOnceWith(
      "type-note",
      "newest",
      "c1",
      expect.any(AbortSignal),
    );
    expect(
      screen.queryByRole("button", { name: "Show more" }),
    ).not.toBeInTheDocument();
  });

  it("renders no Show more in a closed group, so it never loads", () => {
    setup(false);

    expect(
      screen.queryByRole("button", { name: "Show more", hidden: true }),
    ).not.toBeInTheDocument();
    expect(fetchPinnedPage).not.toHaveBeenCalled();
  });
});
