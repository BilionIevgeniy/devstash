import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type {
  DashboardItem,
  ItemDetailJson,
  ItemListPage,
  OpenedItemJson,
} from "@/features/items/types";

// Every key the browser caches for items starts with "items" (ADR 0025): the
// detail of the drawer, the options of the forms' Collections input (items
// fetches them, ADR 0008) and the endless lists. A list key ends with the
// bfcacheId of the page that rendered its first page, so a fresh navigation
// starts from the server's page and Back keeps every page loaded.
export const itemKeys = {
  all: ["items"] as const,
  details: () => ["items", "detail"] as const,
  detail: (id: string) => ["items", "detail", id] as const,
  collectionOptions: () => ["items", "collection-options"] as const,
  lists: () => ["items", "lists"] as const,
  favoriteLists: () => ["items", "lists", "favorites"] as const,
  favorites: (sort: string, bfcacheId: string) =>
    ["items", "lists", "favorites", sort, bfcacheId] as const,
  pinnedLists: () => ["items", "lists", "pinned"] as const,
  pinned: (typeId: string, sort: string, bfcacheId: string) =>
    ["items", "lists", "pinned", typeId, sort, bfcacheId] as const,
};

export type ItemListData = InfiniteData<ItemListPage, string | null>;

/** What a successful action changed, for the cache to follow. */
export type ItemChange =
  | { kind: "favorite"; id: string; isFavorite: boolean }
  | { kind: "pin"; id: string; isPinned: boolean }
  | { kind: "removed"; id: string }
  | { kind: "saved"; detail: ItemDetailJson }
  | { kind: "created" }
  | { kind: "collections" };

type RowPatch = (row: DashboardItem) => DashboardItem | null;

// Every cached page of the lists under `queryKey`, with each row of `id`
// patched, or left out when the patch returns null.
function patchListRows(
  queryClient: QueryClient,
  queryKey: readonly string[],
  id: string,
  patch: RowPatch,
) {
  queryClient.setQueriesData<ItemListData>({ queryKey }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            rows: page.rows.flatMap((row) => {
              if (row.id !== id) return [row];
              const next = patch(row);
              return next ? [next] : [];
            }),
          })),
        }
      : data,
  );
}

function patchDetail(
  queryClient: QueryClient,
  id: string,
  patch: (item: ItemDetailJson) => ItemDetailJson,
) {
  queryClient.setQueryData<OpenedItemJson>(
    itemKeys.detail(id),
    (opened) => opened && { ...opened, item: patch(opened.item) },
  );
}

// Cancels the fetches under `queryKey` that are on their way, so none writes
// back rows it read before the patch, and returns how to start again the ones
// that were not a next page: a first page (a new sort, a detail just opened)
// or a refetch of the loaded pages. A cancel puts a query back as it was and
// starts nothing, so without this a list would stay dimmed for good, or miss
// the row an awaited refetch was bringing. A next page is asked for again by
// LoadMore or Show more. The restart joins a fetch already running.
async function pauseFetches(
  queryClient: QueryClient,
  queryKey: readonly string[],
): Promise<() => Promise<void>> {
  const interrupted = queryClient
    .getQueryCache()
    .findAll({ queryKey, fetchStatus: "fetching" })
    .filter((query) => !query.state.fetchMeta?.fetchMore)
    .map((query) => query.queryKey);
  await queryClient.cancelQueries({ queryKey });
  return async () => {
    await Promise.all(
      interrupted.map((key) =>
        queryClient.refetchQueries(
          { queryKey: key, exact: true },
          { cancelRefetch: false },
        ),
      ),
    );
  };
}

// A star or a pin. The row leaves the lists of that flag when it is turned off;
// turned on, it may enter one. A list on screen is refetched and waited for,
// so the row is in its place when the optimistic value ends (Undo, or a star
// given back in the open drawer); a list off screen is only marked stale.
async function syncFlag(
  queryClient: QueryClient,
  id: string,
  flag: "isFavorite" | "isPinned",
  value: boolean,
) {
  const flagLists =
    flag === "isFavorite" ? itemKeys.favoriteLists() : itemKeys.pinnedLists();
  const [resumeLists, resumeDetail] = await Promise.all([
    pauseFetches(queryClient, itemKeys.lists()),
    pauseFetches(queryClient, itemKeys.detail(id)),
  ]);
  patchListRows(queryClient, itemKeys.lists(), id, (row) => ({
    ...row,
    [flag]: value,
  }));
  if (!value) patchListRows(queryClient, flagLists, id, () => null);
  patchDetail(queryClient, id, (item) => ({ ...item, [flag]: value }));
  void resumeDetail();
  if (!value) {
    void resumeLists();
    return;
  }
  // Refetches and waits for the lists on screen; the others are only marked.
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: flagLists }),
    resumeLists(),
  ]);
}

// An edit: the detail is the action's (the plan read on open is kept), the rows
// take the text they show at once, and the lists are refetched without
// waiting, since a new title can move a row in A-Z.
async function syncSaved(queryClient: QueryClient, detail: ItemDetailJson) {
  const [resumeDetail, resumeLists] = await Promise.all([
    pauseFetches(queryClient, itemKeys.detail(detail.id)),
    pauseFetches(queryClient, itemKeys.lists()),
  ]);
  patchDetail(queryClient, detail.id, () => detail);
  void resumeDetail();
  patchListRows(queryClient, itemKeys.lists(), detail.id, (row) => ({
    ...row,
    title: detail.title,
    description: detail.description,
    tags: detail.tags,
  }));
  void resumeLists();
  void queryClient.invalidateQueries(
    { queryKey: itemKeys.lists() },
    { cancelRefetch: false },
  );
}

async function syncRemoved(queryClient: QueryClient, id: string) {
  const resumeLists = await pauseFetches(queryClient, itemKeys.lists());
  patchListRows(queryClient, itemKeys.lists(), id, () => null);
  queryClient.removeQueries({ queryKey: itemKeys.detail(id) });
  void resumeLists();
}

/**
 * Makes the cache follow a successful action. Awaited inside the caller's
 * transition, before it ends: the optimistic value ends with that transition,
 * and a cached row it hid must already be gone. Each branch cancels the
 * fetches of what it patches first, so a page on its way cannot write back
 * rows it read before the patch, and starts again those that were not a next
 * page (pauseFetches).
 */
export async function syncItemQueries(
  queryClient: QueryClient,
  change: ItemChange,
): Promise<void> {
  switch (change.kind) {
    case "favorite":
      return syncFlag(queryClient, change.id, "isFavorite", change.isFavorite);
    case "pin":
      return syncFlag(queryClient, change.id, "isPinned", change.isPinned);
    case "removed":
      return syncRemoved(queryClient, change.id);
    case "saved":
      return syncSaved(queryClient, change.detail);
    case "created":
      // A new item is never starred or pinned; an import restores neither.
      return queryClient.invalidateQueries(
        { queryKey: itemKeys.lists(), refetchType: "none" },
        { cancelRefetch: false },
      );
    case "collections":
      // A detail names its collections; no list row carries them.
      void queryClient.invalidateQueries({
        queryKey: itemKeys.collectionOptions(),
      });
      void queryClient.invalidateQueries({ queryKey: itemKeys.details() });
      return;
  }
}
