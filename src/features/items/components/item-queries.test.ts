import {
  InfiniteQueryObserver,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  itemKeys,
  syncItemQueries,
  type ItemListData,
} from "@/features/items/components/item-queries";
import type {
  DashboardItem,
  ItemDetailJson,
  OpenedItemJson,
} from "@/features/items/types";

function row(
  id: string,
  overrides: Partial<DashboardItem> = {},
): DashboardItem {
  return {
    id,
    title: `Item ${id}`,
    description: null,
    isFavorite: true,
    isPinned: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    tags: [],
    type: { id: "type-snippet", name: "snippet", icon: "Code", color: "#fff" },
    ...overrides,
  };
}

function list(...pages: string[][]): ItemListData {
  return {
    pages: pages.map((ids, index) => ({
      rows: ids.map((id) => row(id)),
      nextCursor: index < pages.length - 1 ? `c${index}` : null,
    })),
    pageParams: pages.map((_, index) => (index === 0 ? null : `c${index - 1}`)),
  };
}

function detailOf(id: string, title = `Item ${id}`): ItemDetailJson {
  return {
    ...row(id),
    title,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    contentType: "text",
    content: "ls",
    url: null,
    language: null,
    collections: [],
    file: null,
  };
}

const FAVORITES = itemKeys.favorites("newest", "bf1");
const PINNED = itemKeys.pinned("type-snippet", "newest", "bf1");

function ids(client: QueryClient, key: readonly string[]): string[] {
  const data = client.getQueryData<ItemListData>(key);
  return data?.pages.flatMap((page) => page.rows.map((r) => r.id)) ?? [];
}

function seeded(): QueryClient {
  const client = new QueryClient();
  client.setQueryData(FAVORITES, list(["a", "b"], ["c"]));
  client.setQueryData(PINNED, list(["a", "c"]));
  client.setQueryData<OpenedItemJson>(itemKeys.detail("a"), {
    item: detailOf("a"),
    canUseAi: true,
  });
  return client;
}

describe("syncItemQueries", () => {
  it("drops an unstarred row from every page of the favorites and keeps its pin row", async () => {
    const client = seeded();

    await syncItemQueries(client, {
      kind: "favorite",
      id: "a",
      isFavorite: false,
    });

    expect(ids(client, FAVORITES)).toEqual(["b", "c"]);
    expect(ids(client, PINNED)).toEqual(["a", "c"]);
    const pinRow = client.getQueryData<ItemListData>(PINNED)?.pages[0].rows[0];
    expect(pinRow?.isFavorite).toBe(false);
    expect(
      client.getQueryData<OpenedItemJson>(itemKeys.detail("a"))?.item
        .isFavorite,
    ).toBe(false);
  });

  it("cancels a page on its way before the patch, so it cannot write the row back", async () => {
    const client = seeded();
    const cancel = vi.spyOn(client, "cancelQueries");

    await syncItemQueries(client, { kind: "pin", id: "c", isPinned: false });

    expect(cancel).toHaveBeenCalledWith({ queryKey: itemKeys.lists() });
    expect(ids(client, PINNED)).toEqual(["a"]);
    expect(ids(client, FAVORITES)).toEqual(["a", "b", "c"]);
  });

  it("refetches and waits for a list on screen that a star brings the row back to", async () => {
    const client = seeded();
    const queryFn = vi.fn().mockResolvedValue(list(["z", "b"]).pages[0]);
    const observer = new QueryObserver(client, {
      queryKey: FAVORITES,
      queryFn,
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});

    await syncItemQueries(client, {
      kind: "favorite",
      id: "z",
      isFavorite: true,
    });

    expect(queryFn).toHaveBeenCalled();
    unsubscribe();
  });

  it("only marks a list off screen stale when a star may add to it", async () => {
    const client = seeded();

    await syncItemQueries(client, {
      kind: "favorite",
      id: "z",
      isFavorite: true,
    });

    expect(client.getQueryState(FAVORITES)?.isInvalidated).toBe(true);
    expect(ids(client, FAVORITES)).toEqual(["a", "b", "c"]);
  });

  it("drops a deleted row from every list and forgets its detail", async () => {
    const client = seeded();

    await syncItemQueries(client, { kind: "removed", id: "a" });

    expect(ids(client, FAVORITES)).toEqual(["b", "c"]);
    expect(ids(client, PINNED)).toEqual(["c"]);
    expect(client.getQueryData(itemKeys.detail("a"))).toBeUndefined();
  });

  it("writes a saved detail and keeps the plan read on open", async () => {
    const client = seeded();

    await syncItemQueries(client, {
      kind: "saved",
      detail: detailOf("a", "New"),
    });

    const opened = client.getQueryData<OpenedItemJson>(itemKeys.detail("a"));
    expect(opened?.item.title).toBe("New");
    expect(opened?.canUseAi).toBe(true);
    const rows = client.getQueryData<ItemListData>(FAVORITES)?.pages[0].rows;
    expect(rows?.[0].title).toBe("New");
    expect(client.getQueryState(FAVORITES)?.isInvalidated).toBe(true);
  });

  it("writes no detail for an item that was never opened in the drawer", async () => {
    const client = seeded();

    await syncItemQueries(client, { kind: "saved", detail: detailOf("b") });

    expect(client.getQueryData(itemKeys.detail("b"))).toBeUndefined();
  });

  it("leaves the lists alone for a change of collections", async () => {
    const client = seeded();
    client.setQueryData(itemKeys.collectionOptions(), []);

    await syncItemQueries(client, { kind: "collections" });

    expect(client.getQueryState(FAVORITES)?.isInvalidated).toBe(false);
    expect(
      client.getQueryState(itemKeys.collectionOptions())?.isInvalidated,
    ).toBe(true);
    expect(client.getQueryState(itemKeys.detail("a"))?.isInvalidated).toBe(
      true,
    );
  });

  it("marks the lists stale for a new item without fetching them", async () => {
    const client = seeded();

    await syncItemQueries(client, { kind: "created" });

    expect(client.getQueryState(FAVORITES)?.isInvalidated).toBe(true);
    expect(ids(client, FAVORITES)).toEqual(["a", "b", "c"]);
  });

  // A cancel puts a query back as it was and fetches nothing again: without
  // the restart, the list would stay dimmed on its old rows for good.
  it("starts again a first page that a patch cancelled on its way", async () => {
    const client = seeded();
    const key = itemKeys.favorites("a-z", "bf1");
    const first = Promise.withResolvers<ItemListData["pages"][number]>();
    const queryFn = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue(list(["b", "c"]).pages[0]);
    const observer = new InfiniteQueryObserver(client, {
      queryKey: key,
      queryFn,
      initialPageParam: null,
      getNextPageParam: () => null,
    });
    const unsubscribe = observer.subscribe(() => {});
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledOnce());

    await syncItemQueries(client, { kind: "removed", id: "a" });

    await vi.waitFor(() => expect(ids(client, key)).toEqual(["b", "c"]));
    expect(queryFn).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("starts again a refetch that a later patch cancelled, so its row comes back", async () => {
    const client = seeded();
    const refetch = Promise.withResolvers<ItemListData["pages"][number]>();
    const queryFn = vi
      .fn()
      .mockReturnValueOnce(refetch.promise)
      .mockResolvedValue(list(["a", "b", "c"]).pages[0]);
    client.setQueryData(FAVORITES, list(["b", "c"]));
    const observer = new InfiniteQueryObserver(client, {
      queryKey: FAVORITES,
      queryFn,
      initialPageParam: null,
      getNextPageParam: () => null,
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});
    void client.invalidateQueries({ queryKey: FAVORITES });
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledOnce());

    await syncItemQueries(client, { kind: "removed", id: "z" });

    await vi.waitFor(() =>
      expect(ids(client, FAVORITES)).toEqual(["a", "b", "c"]),
    );
    unsubscribe();
  });
});
