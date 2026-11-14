import {
  keepPreviousData,
  useInfiniteQuery,
  type QueryKey,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  fetchFavoritePage,
  fetchPinnedPage,
} from "@/features/items/_internal/components/fetch-item-list-page";
import { itemKeys } from "@/features/items/components/item-queries";
import type { FavoriteItemSort } from "@/features/items/domain/favorite-sort";
import type { PinnedItemSort } from "@/features/items/domain/pinned-items";
import type {
  DashboardItem,
  FavoriteItem,
  FirstListPage,
  ItemListPage,
} from "@/features/items/types";

// A loaded list is reused for this long before it is asked for again.
const LIST_STALE_MS = 30 * 1000;

export interface ItemListPages<T extends DashboardItem> {
  rows: T[];
  /** Rows of the sort before, dimmed while the first page of a new one loads. */
  isPlaceholder: boolean;
  /** The first page of a sort the server did not render could not be read. */
  firstPageFailed: boolean;
  retryFirstPage: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreFailed: boolean;
  loadMore: () => void;
}

interface ListOptions<T extends DashboardItem> {
  queryKey: QueryKey;
  fetchPage: (
    cursor: string | null,
    signal: AbortSignal,
  ) => Promise<ItemListPage<T>>;
  sort: string;
  first: FirstListPage<T>;
}

// An endless list in the Query cache (ADR 0025). The key ends with the
// segment's bfcacheId: a push or replace starts a new entry from the server's
// page, Back and Forward find every page loaded before, and an action's
// refresh keeps the entry the cache sync already fixed. The server's page
// seeds only the sort it rendered; another sort fetches its first page while
// the rows of the old one stay, dimmed.
function useListPages<T extends DashboardItem>({
  queryKey,
  fetchPage,
  sort,
  first,
}: ListOptions<T>): ItemListPages<T> {
  const isRendered = sort === first.sort;
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    initialData: isRendered
      ? { pages: [first.page], pageParams: [null] }
      : undefined,
    initialDataUpdatedAt: isRendered ? first.renderedAt : undefined,
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_MS,
  });

  return {
    rows: query.data?.pages.flatMap((page) => page.rows) ?? [],
    isPlaceholder: query.isPlaceholderData,
    firstPageFailed: query.isError && query.data === undefined,
    retryFirstPage: () => void query.refetch(),
    hasMore: query.hasNextPage && !query.isPlaceholderData,
    // A refetch of the loaded pages counts as busy: a next page asked for
    // during it would join it and fetch nothing, so the button waits, and the
    // end of the list asks again once it is over.
    isLoadingMore: query.isFetchingNextPage || query.isRefetching,
    loadMoreFailed: query.isFetchNextPageError,
    loadMore: () => {
      if (query.isFetching || query.isPlaceholderData) return;
      void query.fetchNextPage({ cancelRefetch: false });
    },
  };
}

export function useFavoritePages(
  sort: FavoriteItemSort,
  first: FirstListPage<FavoriteItem>,
): ItemListPages<FavoriteItem> {
  const { bfcacheId } = useRouter();
  return useListPages({
    queryKey: itemKeys.favorites(sort, bfcacheId),
    fetchPage: (cursor, signal) => fetchFavoritePage(sort, cursor, signal),
    sort,
    first,
  });
}

export function usePinnedGroupPages(
  typeId: string,
  sort: PinnedItemSort,
  first: FirstListPage<DashboardItem>,
): ItemListPages<DashboardItem> {
  const { bfcacheId } = useRouter();
  return useListPages({
    queryKey: itemKeys.pinned(typeId, sort, bfcacheId),
    fetchPage: (cursor, signal) =>
      fetchPinnedPage(typeId, sort, cursor, signal),
    sort,
    first,
  });
}
