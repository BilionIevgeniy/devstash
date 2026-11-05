"use client";

import { useState } from "react";

import { useRowFocus } from "@/app/(app)/_components/hooks/use-row-focus";
import { FavoriteCollections } from "@/app/(app)/favorites/_components/FavoriteCollections";
import { FavoriteItems } from "@/app/(app)/favorites/_components/FavoriteItems";
import {
  sortFavoriteCollections,
  type FavoriteCollectionSort,
} from "@/features/collections/domain/favorite-sort";
import type { FavoriteCollection } from "@/features/collections/types";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import { visibleListItems } from "@/features/items/domain/list-rows";
import {
  sortFavoriteItems,
  type FavoriteItemSort,
} from "@/features/items/domain/favorite-sort";
import type { FavoriteItem } from "@/features/items/types";

interface FavoriteListsProps {
  items: FavoriteItem[];
  collections: FavoriteCollection[];
}

// Owns the empty state too, so both sorts survive the last favorite leaving and
// coming back through the open drawer. The rows that leave at once are left out
// first: the empty state, the sort and the counts all follow from what remains.
export function FavoriteLists({ items, collections }: FavoriteListsProps) {
  const { hiddenIds, favoriteOverrides } = useItemDrawer();
  const [itemSort, setItemSort] = useState<FavoriteItemSort>("newest");
  const [collectionSort, setCollectionSort] =
    useState<FavoriteCollectionSort>("newest");

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
          No favorites yet.
        </p>
      ) : (
        <>
          <FavoriteItems
            items={sortFavoriteItems(visibleItems, itemSort)}
            sort={itemSort}
            onSortChange={setItemSort}
          />
          <FavoriteCollections
            collections={sortFavoriteCollections(collections, collectionSort)}
            sort={collectionSort}
            onSortChange={setCollectionSort}
          />
        </>
      )}
    </div>
  );
}
