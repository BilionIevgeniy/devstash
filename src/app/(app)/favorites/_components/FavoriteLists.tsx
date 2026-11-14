"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useRowFocus } from "@/app/(app)/_components/hooks/use-row-focus";
import { FavoriteCollections } from "@/app/(app)/favorites/_components/FavoriteCollections";
import { FavoriteItems } from "@/app/(app)/favorites/_components/FavoriteItems";
import { useScrollRestore } from "@/components/common/hooks/use-scroll-restore";
import { useSearchParam } from "@/components/common/hooks/use-search-param";
import { sortFavoriteCollections } from "@/features/collections/domain/favorite-sort";
import { favoriteCollectionSortSchema } from "@/features/collections/schemas";
import type { FavoriteCollection } from "@/features/collections/types";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { useFavoritePages } from "@/features/items/components/hooks/use-item-list-pages";
import {
  pendingRemovals,
  visibleListItems,
} from "@/features/items/domain/list-rows";
import { favoriteItemSortSchema } from "@/features/items/schemas";
import type { FavoriteItem, FirstListPage } from "@/features/items/types";

// Both lists start newest first; the default stays out of the URL.
const DEFAULT_SORT = "newest";

interface FavoriteListsProps {
  first: FirstListPage<FavoriteItem>;
  /** Every favorite item, not only the loaded ones. */
  itemCount: number;
  collections: FavoriteCollection[];
}

// Owns the empty state too, so both sorts stay shown when the last favorite
// leaves and comes back through the open drawer. The sorts live in the URL
// (?itemSort=&collectionSort=, feature 7). The items are an endless list read
// in that sort on the server (ADR 0025); the collections, a short list, are
// sorted here in memory and come first, since nothing below an endless list
// could be reached. The counts and the empty state follow every favorite, less
// the ones leaving at once, not only the rows loaded so far.
export function FavoriteLists({
  first,
  itemCount,
  collections,
}: FavoriteListsProps) {
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
  const pages = useFavoritePages(itemSort, first);

  const visibleItems = visibleListItems(
    pages.rows,
    hiddenIds,
    favoriteOverrides,
  );
  const shownItemCount = Math.max(
    0,
    itemCount - pendingRemovals(pages.rows, hiddenIds, favoriteOverrides),
  );
  const { listRef, handleFocus, focusRowAt } = useRowFocus(
    visibleItems.length + collections.length,
  );
  const { bfcacheId } = useRouter();
  useScrollRestore(listRef, `favorites:${bfcacheId}`);

  return (
    <div ref={listRef} onFocusCapture={handleFocus} className="space-y-8">
      {shownItemCount + collections.length === 0 ? (
        <p
          data-list-empty
          tabIndex={-1}
          className="text-sm text-muted-foreground outline-none"
        >
          {t("empty")}
        </p>
      ) : (
        <>
          <FavoriteCollections
            collections={sortFavoriteCollections(collections, collectionSort)}
            sort={collectionSort}
            onSortChange={(sort) => setCollectionSortValue(sort)}
          />
          <FavoriteItems
            items={visibleItems}
            count={shownItemCount}
            pages={pages}
            sort={itemSort}
            onSortChange={(sort) => setItemSortValue(sort)}
            onFocusRow={(index) => focusRowAt(collections.length + index)}
          />
        </>
      )}
    </div>
  );
}
