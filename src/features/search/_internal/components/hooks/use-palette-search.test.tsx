import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchOutcome } from "@/features/search/_internal/components/fetch-search-results";

const fetchSearchResults = vi.hoisted(() => vi.fn());
vi.mock("@/features/search/_internal/components/fetch-search-results", () => ({
  fetchSearchResults,
}));

import {
  SEARCH_DEBOUNCE_MS,
  usePaletteSearch,
} from "@/features/search/_internal/components/hooks/use-palette-search";

function answer(name: string, nextCursor: string | null = null): SearchOutcome {
  return {
    status: "ready",
    results: {
      items: [],
      collections: [{ id: name, name, itemCount: 0 }],
      nextCursor,
    },
  };
}

function page(
  itemIds: string[],
  collections: { id: string; name: string; itemCount: number }[],
  nextCursor: string | null,
): SearchOutcome {
  return {
    status: "ready",
    results: {
      items: itemIds.map((id) => ({
        id,
        title: id,
        description: null,
        isFavorite: false,
        isPinned: false,
        createdAt: new Date("2026-01-15T00:00:00Z"),
        type: { id: "type-1", name: "note", icon: "StickyNote" },
        tags: [],
        preview: null,
        isLocked: false,
      })),
      collections,
      nextCursor,
    },
  };
}

type Read = PromiseWithResolvers<SearchOutcome>;

// Every fetch waits until the test lets its answer through.
let reads: Read[];

const callsFor = (query: string) =>
  fetchSearchResults.mock.calls.filter(([q]) => q === query);
const namesOf = (outcome: SearchOutcome | null) =>
  outcome?.status === "ready"
    ? outcome.results.collections.map(({ name }) => name)
    : null;

function renderSearch(text = "") {
  return renderHook(({ value }) => usePaletteSearch(value), {
    initialProps: { value: text },
  });
}

const pause = () => act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

beforeEach(() => {
  vi.useFakeTimers();
  reads = [];
  fetchSearchResults.mockImplementation(() => {
    const read = Promise.withResolvers<SearchOutcome>();
    reads.push(read);
    return read.promise;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePaletteSearch", () => {
  it("reads the recent list once and shows it for an empty text", async () => {
    const { result, rerender } = renderSearch();
    expect(callsFor("")).toHaveLength(1);

    await act(async () => reads[0].resolve(answer("recent")));
    expect(namesOf(result.current.outcome)).toEqual(["recent"]);

    rerender({ value: "r" });
    await pause();
    rerender({ value: "  " });
    await pause();

    expect(fetchSearchResults).toHaveBeenCalledTimes(1);
    expect(namesOf(result.current.outcome)).toEqual(["recent"]);
  });

  it("sends nothing for a text too short to match, and keeps the recent list", async () => {
    const { result } = renderSearch("r");
    await act(async () => reads[0].resolve(answer("recent")));
    await pause();

    expect(fetchSearchResults).toHaveBeenCalledTimes(1);
    expect(result.current.isPending).toBe(false);
    expect(namesOf(result.current.outcome)).toEqual(["recent"]);
  });

  it("sends one request per pause in typing", async () => {
    const { rerender } = renderSearch();
    for (const value of ["r", "re", "rea", "reac", "react"]) {
      rerender({ value });
      act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50));
    }
    expect(callsFor("react")).toHaveLength(0);

    await pause();

    expect(fetchSearchResults).toHaveBeenCalledTimes(2);
    expect(callsFor("react")).toHaveLength(1);
  });

  it("ignores a late answer for an older text", async () => {
    const { result, rerender } = renderSearch("react");
    await pause();
    const older = reads[1];

    rerender({ value: "redux" });
    expect(fetchSearchResults.mock.calls[1][2].aborted).toBe(true);
    await pause();
    await act(async () => reads[2].resolve(answer("redux")));
    await act(async () => older.resolve(answer("react")));

    expect(namesOf(result.current.outcome)).toEqual(["redux"]);
  });

  it("keeps the last results on screen while the next text is pending", async () => {
    const { result, rerender } = renderSearch("react");
    await pause();
    await act(async () => reads[1].resolve(answer("react")));

    rerender({ value: "reactive" });

    expect(result.current.isPending).toBe(true);
    expect(result.current.outcome).toBeNull();
    expect(result.current.previous?.collections[0].name).toBe("react");
  });

  it("appends the next page and keeps the collections of the first", async () => {
    const { result } = renderSearch("react");
    await pause();
    await act(async () =>
      reads[1].resolve(
        page(["a", "b"], [{ id: "col", name: "col", itemCount: 0 }], "20"),
      ),
    );

    act(() => result.current.loadMore());
    expect(result.current.isLoadingMore).toBe(true);
    expect(fetchSearchResults.mock.calls[2].slice(0, 2)).toEqual([
      "react",
      "20",
    ]);
    // "b" moved between the pages: it is not listed twice.
    await act(async () => reads[2].resolve(page(["b", "c"], [], null)));

    expect(result.current.isLoadingMore).toBe(false);
    const results =
      result.current.outcome?.status === "ready"
        ? result.current.outcome.results
        : null;
    expect(results?.items.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(results?.collections.map(({ id }) => id)).toEqual(["col"]);
    expect(results?.nextCursor).toBeNull();
  });

  it("retries the same text after a failure", async () => {
    const { result } = renderSearch("react");
    await pause();
    await act(async () => reads[1].resolve({ status: "error" }));
    expect(result.current.outcome).toEqual({ status: "error" });

    act(() => result.current.retry());
    expect(result.current.isPending).toBe(true);
    await act(async () => reads[2].resolve(answer("react")));

    expect(namesOf(result.current.outcome)).toEqual(["react"]);
  });

  it("treats a network failure as an error, not an abort", async () => {
    const { result } = renderSearch("react");
    await pause();
    await act(async () => reads[1].reject(new TypeError("offline")));

    expect(result.current.outcome).toEqual({ status: "error" });
  });

  it("aborts the running requests on unmount", async () => {
    const { unmount } = renderSearch("react");
    await pause();

    unmount();

    for (const [, , signal] of fetchSearchResults.mock.calls) {
      expect(signal.aborted).toBe(true);
    }
  });
});
