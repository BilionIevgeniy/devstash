import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SearchIndex } from "@/features/search/types";

const fetchSearchIndex = vi.hoisted(() => vi.fn());
vi.mock("@/features/search/_internal/components/fetch-search-index", () => ({
  fetchSearchIndex,
}));

import { useSearchIndex } from "@/features/search/_internal/components/hooks/use-search-index";

function indexNamed(name: string): SearchIndex {
  return { items: [], collections: [{ id: name, name, itemCount: 0 }] };
}

const OLD_INDEX = indexNamed("old");
const NEW_INDEX = indexNamed("new");

type Read = PromiseWithResolvers<SearchIndex | null>;

// Each call of the fetch gets the next read, so a test decides which answer
// arrives when.
function queueReads(count: number): Read[] {
  const reads = Array.from({ length: count }, () =>
    Promise.withResolvers<SearchIndex | null>(),
  );
  for (const read of reads) fetchSearchIndex.mockReturnValueOnce(read.promise);
  return reads;
}

function signalOfCall(call: number): AbortSignal {
  return fetchSearchIndex.mock.calls[call][0];
}

describe("useSearchIndex", () => {
  it("loads on mount and becomes ready with the index", async () => {
    const [first] = queueReads(1);
    const { result } = renderHook(() => useSearchIndex());
    expect(result.current.state).toEqual({ status: "loading" });

    await act(async () => first.resolve(OLD_INDEX));

    expect(result.current.state).toEqual({ status: "ready", index: OLD_INDEX });
  });

  it("keeps the newer index when an older read answers after it", async () => {
    const [older, newer] = queueReads(2);
    const { result } = renderHook(() => useSearchIndex());
    act(() => result.current.refresh());
    expect(signalOfCall(0).aborted).toBe(true);

    await act(async () => newer.resolve(NEW_INDEX));
    await act(async () => older.resolve(OLD_INDEX));

    expect(result.current.state).toEqual({ status: "ready", index: NEW_INDEX });
  });

  it("does not take an aborted read for a failure", async () => {
    const [older, newer] = queueReads(2);
    const { result } = renderHook(() => useSearchIndex());
    act(() => result.current.refresh());

    await act(async () => older.reject(new DOMException("", "AbortError")));

    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => newer.resolve(NEW_INDEX));
    expect(result.current.state).toEqual({ status: "ready", index: NEW_INDEX });
  });

  it("keeps showing the index when a refresh fails", async () => {
    const [first, second] = queueReads(2);
    const { result } = renderHook(() => useSearchIndex());
    await act(async () => first.resolve(OLD_INDEX));
    act(() => result.current.refresh());

    await act(async () => second.resolve(null));

    expect(result.current.state).toEqual({ status: "ready", index: OLD_INDEX });
  });

  it("shows an error when the first read fails, and loads again on refresh", async () => {
    const [first, second] = queueReads(2);
    const { result } = renderHook(() => useSearchIndex());
    await act(async () => first.resolve(null));
    expect(result.current.state).toEqual({ status: "error" });

    act(() => result.current.refresh());
    expect(result.current.state).toEqual({ status: "loading" });

    await act(async () => second.resolve(NEW_INDEX));
    expect(result.current.state).toEqual({ status: "ready", index: NEW_INDEX });
  });

  it("aborts the read in flight when it unmounts", () => {
    queueReads(1);
    const { unmount } = renderHook(() => useSearchIndex());
    expect(signalOfCall(0).aborted).toBe(false);

    unmount();

    expect(signalOfCall(0).aborted).toBe(true);
  });
});
