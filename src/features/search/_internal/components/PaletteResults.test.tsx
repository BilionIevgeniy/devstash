import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchOutcome } from "@/features/search/_internal/components/fetch-search-results";
import type { PaletteItem } from "@/features/search/types";

const { fetchSearchResults, open } = vi.hoisted(() => ({
  fetchSearchResults: vi.fn(),
  open: vi.fn(),
}));
vi.mock("@/features/search/_internal/components/fetch-search-results", () => ({
  fetchSearchResults,
}));
vi.mock("@/features/items/components/hooks/use-item-drawer", () => ({
  useItemDrawer: () => ({ open }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));

import { SEARCH_DEBOUNCE_MS } from "@/features/search/_internal/components/hooks/use-palette-search";
import { PaletteResults } from "@/features/search/_internal/components/PaletteResults";

function item(title: string): PaletteItem {
  return {
    id: title,
    title,
    description: null,
    isFavorite: false,
    isPinned: false,
    createdAt: new Date("2026-01-15T00:00:00Z"),
    type: { id: "type-1", name: "snippet", icon: "Code" },
    tags: [],
    preview: null,
    isLocked: false,
  };
}

const found = (...titles: string[]): SearchOutcome => ({
  status: "ready",
  results: { items: titles.map(item), collections: [], nextCursor: null },
});

let reads: Map<string, PromiseWithResolvers<SearchOutcome>>;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  reads = new Map();
  fetchSearchResults.mockImplementation((query: string) => {
    const read = Promise.withResolvers<SearchOutcome>();
    reads.set(query, read);
    return read.promise;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function renderPalette() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<PaletteResults onClose={vi.fn()} onDrawerOpen={vi.fn()} />);
  return user;
}

const answer = (query: string, outcome: SearchOutcome) =>
  act(async () => reads.get(query)?.resolve(outcome));

describe("PaletteResults", () => {
  it("shows the recent items for an empty input", async () => {
    renderPalette();
    await answer("", found("Recent snippet"));

    expect(
      screen.getByRole("option", { name: "Recent snippet" }),
    ).toBeVisible();
  });

  it("shows the results of the latest input, whatever answers last", async () => {
    const user = renderPalette();
    await answer("", found("Recent snippet"));

    await user.type(screen.getByRole("combobox"), "rea");
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
    await user.type(screen.getByRole("combobox"), "ct");
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));

    await answer("react", found("React hooks"));
    await answer("rea", found("Old answer"));

    expect(screen.getByRole("option", { name: "React hooks" })).toBeVisible();
    expect(screen.queryByText("Old answer")).not.toBeInTheDocument();
  });

  it("offers a retry in plain words when the search fails", async () => {
    const user = renderPalette();
    await answer("", found());
    await user.type(screen.getByRole("combobox"), "react");
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));

    await answer("react", { status: "rate-limited" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Too many searches. Wait a moment and try again.",
    );
    expect(screen.getByRole("option", { name: "Try again" })).toBeVisible();
  });

  it("says when nothing matches", async () => {
    const user = renderPalette();
    await answer("", found("Recent snippet"));
    await user.type(screen.getByRole("combobox"), "zzz");
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));

    await answer("zzz", found());

    expect(screen.getByText("No results found.")).toBeVisible();
  });
});
