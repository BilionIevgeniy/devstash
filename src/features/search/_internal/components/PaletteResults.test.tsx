import { act, render, screen, within } from "../../../../../test/intl";
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
    descriptionAiGenerated: false,
    aiTags: [],
    createdAt: new Date("2026-01-15T00:00:00Z"),
    type: { id: "type-1", name: "snippet", slug: "snippets", icon: "Code" },
    tags: [],
    preview: null,
    previewAiGenerated: false,
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

function expectNoDanglingRow() {
  for (const role of ["combobox", "listbox"]) {
    const id = screen.getByRole(role).getAttribute("aria-activedescendant");
    if (id !== null) expect(document.getElementById(id)).not.toBeNull();
  }
}

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

  // A listbox may own options and groups only: a message inside it is not
  // announced, so the failure sits next to the list and the retry in it.
  it("says a failure next to the list, with the retry as its option", async () => {
    const user = renderPalette();
    await answer("", found());
    await user.type(screen.getByRole("combobox"), "react");
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));

    await answer("react", { status: "error" });

    const list = screen.getByRole("listbox");
    expect(screen.getByRole("alert")).toBeVisible();
    expect(within(list).queryByRole("alert")).not.toBeInTheDocument();
    expect(
      within(list).getByRole("option", { name: "Try again" }),
    ).toBeVisible();
  });

  it("marks the list busy and its old rows disabled while an answer is pending", async () => {
    const user = renderPalette();
    await answer("", found("Recent snippet"));
    expect(screen.getByRole("listbox")).not.toHaveAttribute("aria-busy");

    await user.type(screen.getByRole("combobox"), "react");
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));

    expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("option", { name: "Recent snippet" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  // A row of the recent list that also matches keeps its place in the list.
  it("selects the first result, so Enter opens it", async () => {
    const user = renderPalette();
    await answer("", found("Recent snippet", "React hooks"));
    await user.type(screen.getByRole("combobox"), "react");
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));

    await answer("react", found("React hooks"));
    expect(screen.getByRole("option", { selected: true })).toHaveAccessibleName(
      "React hooks",
    );

    await user.keyboard("{Enter}");
    expect(open).toHaveBeenCalledOnce();
  });

  // A screen reader would be sent to an option that does not exist.
  it.each([
    ["some", found("React hooks")],
    ["none", found()],
    ["a failure", { status: "error" } as const],
  ])("names no row that is gone, with %s as the answer", async (_, outcome) => {
    const user = renderPalette();
    await answer("", found("Recent snippet", "React hooks"));
    await user.keyboard("{ArrowDown}{ArrowUp}");
    await user.type(screen.getByRole("combobox"), "react");
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
    expectNoDanglingRow();

    await answer("react", outcome);
    expectNoDanglingRow();
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
