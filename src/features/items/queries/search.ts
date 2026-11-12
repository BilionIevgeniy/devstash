import "server-only";

import { toSearchPreview } from "@/features/items/_internal/domain/search-preview";
import {
  cardItemSelect,
  toDashboardItem,
} from "@/features/items/_internal/queries";
import { rankUserItemIds } from "@/features/items/_internal/queries/search-ranking";
import { copyValueOf } from "@/features/items/domain/item-fields";
import {
  SEARCH_PAGE_SIZE,
  toSearchMatch,
} from "@/features/items/domain/search-text";
import type {
  SearchableItem,
  SearchableItemPage,
} from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";
import { orderByIds } from "@/lib/order-by-ids";
import { prisma } from "@/lib/prisma";

// The rows the command palette shows (ADR 0018): what it searches and what it
// lists for an empty query.

const RECENT_SEARCHABLE_ITEMS_LIMIT = 8;

type RawCardItem = Prisma.ItemGetPayload<{ select: typeof cardItemSelect }>;

// The content is read only to build the preview; it stays on the server.
function toSearchableItem({
  contentType,
  content,
  url,
  ...item
}: RawCardItem): SearchableItem {
  return {
    ...toDashboardItem(item),
    preview: toSearchPreview(copyValueOf({ contentType, content, url })),
  };
}

// The list of an empty query: the last edited items.
export async function getRecentSearchableItems(
  userId: string,
): Promise<SearchableItem[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: RECENT_SEARCHABLE_ITEMS_LIMIT,
    select: cardItemSelect,
  });
  return items.map(toSearchableItem);
}

// One page of the user's items matching the text, best first. The ranking
// reads one row more than the page, to know whether another page exists. A
// text with no term and too short for the typo match finds nothing, without a
// query.
export async function searchUserItems(
  userId: string,
  text: string,
  offset: number,
): Promise<SearchableItemPage> {
  const match = toSearchMatch(text);
  if (match === null) return { items: [], nextOffset: null };

  const ids = await rankUserItemIds(userId, match, {
    offset,
    limit: SEARCH_PAGE_SIZE + 1,
  });
  if (ids.length === 0) return { items: [], nextOffset: null };
  const pageIds = ids.slice(0, SEARCH_PAGE_SIZE);
  // The owner again: the ids come from raw SQL, and an item deleted since is
  // simply left out.
  const rows = await prisma.item.findMany({
    where: { userId, id: { in: pageIds } },
    select: cardItemSelect,
  });

  return {
    items: orderByIds(pageIds, rows).map(toSearchableItem),
    nextOffset:
      ids.length > SEARCH_PAGE_SIZE ? offset + SEARCH_PAGE_SIZE : null,
  };
}
