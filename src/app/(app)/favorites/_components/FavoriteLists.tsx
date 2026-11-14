"use client";
import { useTranslations } from "next-intl";

import { useRowFocus } from "@/app/(app)/_components/hooks/use-row-focus";
import { FavoriteCollections } from "@/app/(app)/favorites/_components/FavoriteCollections";
import { FavoriteItems } from "@/app/(app)/favorites/_components/FavoriteItems";
import { useSearchParam } from "@/components/common/hooks/use-search-param";
import { sortFavoriteCollections } from "@/features/collections/domain/favorite-sort";
import { favoriteCollectionSortSchema } from "@/features/collections/schemas";
import type { FavoriteCollection } from "@/features/collections/types";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { visibleListItems } from "@/features/items/domain/list-rows";
import { sortFavoriteItems } from "@/features/items/domain/favorite-sort";
import { favoriteItemSortSchema } from "@/features/items/schemas";
import type { FavoriteItem } from "@/features/items/types";

// Both lists start newest first; the default stays out of the URL.
const DEFAULT_SORT = "newest";

interface FavoriteListsProps {
  items: FavoriteItem[];
  collections: FavoriteCollection[];
}

// Owns the empty state too, so both sorts stay shown when the last favorite
// leaves and comes back through the open drawer. The sorts live in the URL
// (?itemSort=&collectionSort=, feature 7) and sort the rows here, in memory.
// The rows that leave at once are left out first: the empty state, the sort
// and the counts all follow from what remains.
export function FavoriteLists({ items, collections }: FavoriteListsProps) {
  const t = useTranslations("pages.favorites");
  const { hiddenIds, favoriteOverrides } = useItemDrawer();
  const [itemSortValue, setItemSortValue] = useSearchParam(
    "itemSort",
    DEFAULT_SORT,
  );
  const [collectionSortValue, setCollectionSortValue] = useSearchParam(
    "collectionSort",
    DEFAULT_SORT,
  );
  const itemSort = favoriteItemSortSchema.parse(itemSortValue);
  const collectionSort =
    favoriteCollectionSortSchema.parse(collectionSortValue);

  const visibleItems = visibleListItems(items, hiddenIds, favoriteOverrides);
  const rowCount = visibleItems.length + collections.length;
  const { listRef, handleFocus } = useRowFocus(rowCount);

  return (
    <div ref={listRef} onFocusCapture={handleFocus} className="space-y-8">
      {rowCount === 0 ? (
        <p
          data-list-empty
          tabIndex={-1}
          className="text-sm text-muted-foreground outline-none"
        >
          {t("empty")}
        </p>
      ) : (
        <>
          <FavoriteItems
            items={sortFavoriteItems(visibleItems, itemSort)}
            sort={itemSort}
            onSortChange={(sort) => setItemSortValue(sort)}
          />
          <FavoriteCollections
            collections={sortFavoriteCollections(collections, collectionSort)}
            sort={collectionSort}
            onSortChange={(sort) => setCollectionSortValue(sort)}
          />
        </>
      )}
    </div>
  );
}
