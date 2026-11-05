"use client";

import { useState } from "react";

import { FavoriteCollections } from "@/app/(app)/favorites/_components/FavoriteCollections";
import { FavoriteItems } from "@/app/(app)/favorites/_components/FavoriteItems";
import {
  sortFavoriteCollections,
  type FavoriteCollectionSort,
} from "@/features/collections/domain/favorite-sort";
import type { FavoriteCollection } from "@/features/collections/types";
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
// coming back through the open drawer.
export function FavoriteLists({ items, collections }: FavoriteListsProps) {
  const [itemSort, setItemSort] = useState<FavoriteItemSort>("newest");
  const [collectionSort, setCollectionSort] =
    useState<FavoriteCollectionSort>("newest");

  if (items.length === 0 && collections.length === 0) {
    return <p className="text-sm text-muted-foreground">No favorites yet.</p>;
  }

  return (
    <div className="space-y-8">
      <FavoriteItems
        items={sortFavoriteItems(items, itemSort)}
        sort={itemSort}
        onSortChange={setItemSort}
      />
      <FavoriteCollections
        collections={sortFavoriteCollections(collections, collectionSort)}
        sort={collectionSort}
        onSortChange={setCollectionSort}
      />
    </div>
  );
}
