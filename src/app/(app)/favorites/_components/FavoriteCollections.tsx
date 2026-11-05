import Link from "next/link";
import { Folder } from "lucide-react";

import {
  FAVORITE_ROW_WRAPPER,
  FavoriteRow,
} from "@/app/(app)/favorites/_components/FavoriteRow";
import { FavoriteSection } from "@/app/(app)/favorites/_components/FavoriteSection";
import { FavoriteSortSelect } from "@/app/(app)/favorites/_components/FavoriteSortSelect";
import {
  FAVORITE_COLLECTION_SORTS,
  type FavoriteCollectionSort,
} from "@/features/collections/domain/favorite-sort";
import type { FavoriteCollection } from "@/features/collections/types";

interface FavoriteCollectionsProps {
  collections: FavoriteCollection[];
  sort: FavoriteCollectionSort;
  onSortChange: (sort: FavoriteCollectionSort) => void;
}

export function FavoriteCollections({
  collections,
  sort,
  onSortChange,
}: FavoriteCollectionsProps) {
  if (collections.length === 0) return null;

  return (
    <FavoriteSection
      title="Collections"
      count={collections.length}
      action={
        <FavoriteSortSelect
          sorts={FAVORITE_COLLECTION_SORTS}
          value={sort}
          onChange={onSortChange}
          ariaLabel="Sort collections"
        />
      }
    >
      {collections.map((collection) => (
        <Link
          key={collection.id}
          href={`/collections/${collection.id}`}
          className={FAVORITE_ROW_WRAPPER}
        >
          <FavoriteRow
            icon={<Folder className="size-4 shrink-0 text-muted-foreground" />}
            title={collection.name}
            badge="collection"
            date={collection.favoritedAt}
          />
        </Link>
      ))}
    </FavoriteSection>
  );
}
