import Link from "next/link";
import { useTranslations } from "next-intl";
import { Folder } from "lucide-react";

import { LIST_ROW_WRAPPER, ListRow } from "@/app/(app)/_components/ListRow";
import { ListRowFrame } from "@/app/(app)/_components/ListRowFrame";
import { SortSelect } from "@/app/(app)/_components/SortSelect";
import { FavoriteSection } from "@/app/(app)/favorites/_components/FavoriteSection";
import { CollectionRowFavorite } from "@/features/collections/components/CollectionRowFavorite";
import {
  FAVORITE_COLLECTION_SORTS,
  type FavoriteCollectionSort,
} from "@/features/collections/domain/favorite-sort";
import type { FavoriteCollection } from "@/features/collections/types";
import { cn } from "@/lib/utils";

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
  const t = useTranslations("pages.favorites");
  if (collections.length === 0) return null;

  return (
    <FavoriteSection
      title={t("collections")}
      count={collections.length}
      action={
        <SortSelect
          sorts={FAVORITE_COLLECTION_SORTS}
          value={sort}
          onChange={onSortChange}
          ariaLabel={t("sortCollections")}
        />
      }
    >
      {collections.map((collection) => (
        <ListRowFrame
          key={collection.id}
          actions={
            <CollectionRowFavorite
              collectionId={collection.id}
              name={collection.name}
            />
          }
        >
          <Link
            href={`/collections/${collection.id}`}
            className={LIST_ROW_WRAPPER}
          >
            <ListRow
              icon={
                <Folder
                  className={cn(
                    "size-4 shrink-0",
                    !collection.color && "text-muted-foreground",
                  )}
                  style={
                    collection.color ? { color: collection.color } : undefined
                  }
                />
              }
              title={collection.name}
              badge={t("collectionBadge")}
              date={collection.favoritedAt}
            />
          </Link>
        </ListRowFrame>
      ))}
    </FavoriteSection>
  );
}
