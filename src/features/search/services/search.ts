import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import {
  getRecentSearchableCollections,
  searchUserCollections,
} from "@/features/collections/queries/search";
import type { SearchableCollection } from "@/features/collections/types";
import { canUseType } from "@/features/items/domain/item-fields";
import {
  getRecentSearchableItems,
  searchUserItems,
} from "@/features/items/queries/search";
import type { SearchableItemPage } from "@/features/items/types";
import {
  SEARCH_BY_USER_MINUTE,
  SEARCH_OFFSET_MAX,
} from "@/features/search/domain/limits";
import type { SearchParams } from "@/features/search/schemas";
import type { PaletteResults } from "@/features/search/types";
import { consumeRateLimit } from "@/lib/rate-limit";

export type PaletteSearchResult =
  | { status: "ok"; results: PaletteResults }
  | { status: "rate-limited"; reset: number };

const NO_ITEMS: SearchableItemPage = { items: [], nextOffset: null };

// The cursor of the next page, or null past the deepest page the route takes:
// a cursor the schema refuses would only fail on "Show more".
function nextCursorOf({ nextOffset }: SearchableItemPage): string | null {
  if (nextOffset === null || nextOffset > SEARCH_OFFSET_MAX) return null;
  return String(nextOffset);
}

// The recent list for an empty text; otherwise one page of items, with the
// collections on the first page only.
function readMatches(
  userId: string,
  { q, cursor }: SearchParams,
): [Promise<SearchableItemPage>, Promise<SearchableCollection[]>] {
  if (q === "") {
    return [
      getRecentSearchableItems(userId).then((items) => ({
        ...NO_ITEMS,
        items,
      })),
      getRecentSearchableCollections(userId),
    ];
  }
  return [
    searchUserItems(userId, q, cursor),
    cursor === 0 ? searchUserCollections(userId, q) : Promise.resolve([]),
  ];
}

// What the palette shows for a text (ADR 0018). The limit is checked first.
// The signal is checked between the steps: Prisma cannot cancel a running
// query, so an abort skips the reads not started yet and the running one
// finishes; the caller answers nothing useful then. A RateLimitUnavailableError
// propagates, so the route answers that search is unavailable.
export async function searchPalette(
  userId: string,
  params: SearchParams,
  signal: AbortSignal,
): Promise<PaletteSearchResult> {
  const limit = await consumeRateLimit(SEARCH_BY_USER_MINUTE, userId);
  if (!limit.success) return { status: "rate-limited", reset: limit.reset };
  signal.throwIfAborted();

  const [page, collections, { isPro }] = await Promise.all([
    ...readMatches(userId, params),
    getEntitlements(userId),
  ]);
  signal.throwIfAborted();

  return {
    status: "ok",
    results: {
      items: page.items.map((item) => ({
        ...item,
        isLocked: !canUseType(item.type.name, isPro),
      })),
      collections,
      nextCursor: nextCursorOf(page),
    },
  };
}
