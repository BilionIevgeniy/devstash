import "client-only";

import type {
  DashboardItem,
  FavoriteItem,
  ItemListPage,
} from "@/features/items/types";
import { readRouteData } from "@/lib/route-error";

// A row as JSON writes it: its dates as ISO strings.
type Json<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

interface JsonPage<T> {
  rows: Json<T>[];
  nextCursor: string | null;
}

async function fetchPage<T>(
  path: string,
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<JsonPage<T>> {
  const response = await fetch(`${path}?${params}`, { signal });
  return readRouteData<JsonPage<T>>(response);
}

function pageParams(entries: Record<string, string | null>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(entries)) {
    if (value !== null) params.set(name, value);
  }
  return params;
}

// The browser side of GET /api/items/favorites. The rows go to the drawer and
// the list, which take real Dates, so they come back as the server's first
// page has them (ADR 0025). A refusal or failure throws a RouteError for the
// Query retry rule.
export async function fetchFavoritePage(
  sort: string,
  cursor: string | null,
  signal: AbortSignal,
): Promise<ItemListPage<FavoriteItem>> {
  const page = await fetchPage<FavoriteItem>(
    "/api/items/favorites",
    pageParams({ sort, cursor }),
    signal,
  );
  return {
    nextCursor: page.nextCursor,
    rows: page.rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      favoritedAt: new Date(row.favoritedAt),
    })),
  };
}

// The browser side of GET /api/items/pinned: the next page of one type.
export async function fetchPinnedPage(
  typeId: string,
  sort: string,
  cursor: string | null,
  signal: AbortSignal,
): Promise<ItemListPage> {
  const page = await fetchPage<DashboardItem>(
    "/api/items/pinned",
    pageParams({ typeId, sort, cursor }),
    signal,
  );
  return {
    nextCursor: page.nextCursor,
    rows: page.rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    })),
  };
}
