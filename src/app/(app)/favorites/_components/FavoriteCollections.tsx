import Link from "next/link";
import { Folder } from "lucide-react";

import { LIST_ROW_WRAPPER, ListRow } from "@/app/(app)/_components/ListRow";
import { SortSelect } from "@/app/(app)/_components/SortSelect";
import { FavoriteSection } from "@/app/(app)/favorites/_components/FavoriteSection";
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
        <SortSelect
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
          className={LIST_ROW_WRAPPER}
        >
          <ListRow
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
