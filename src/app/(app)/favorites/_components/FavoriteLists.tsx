"use client";

import { useState } from "react";

import { FavoriteCollections } from "@/app/(app)/favorites/_components/FavoriteCollections";
import { FavoriteItems } from "@/app/(app)/favorites/_components/FavoriteItems";
import { FavoriteSortSelect } from "@/app/(app)/favorites/_components/FavoriteSortSelect";
import { sortFavoriteCollections } from "@/features/collections/domain/favorite-sort";
import type { FavoriteCollection } from "@/features/collections/types";
import {
  sortFavoriteItems,
  type FavoriteSort,
} from "@/features/items/domain/favorite-sort";
import type { FavoriteItem } from "@/features/items/types";

interface FavoriteListsProps {
  items: FavoriteItem[];
  collections: FavoriteCollection[];
}

// Owns the empty state too, so the sort survives the last favorite leaving and
// coming back through the open drawer.
export function FavoriteLists({ items, collections }: FavoriteListsProps) {
  const [sort, setSort] = useState<FavoriteSort>("date");

  if (items.length === 0 && collections.length === 0) {
    return <p className="text-sm text-muted-foreground">No favorites yet.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex">
        <FavoriteSortSelect value={sort} onChange={setSort} />
      </div>
      <FavoriteItems items={sortFavoriteItems(items, sort)} />
      <FavoriteCollections
        collections={sortFavoriteCollections(collections, sort)}
      />
    </div>
  );
}
