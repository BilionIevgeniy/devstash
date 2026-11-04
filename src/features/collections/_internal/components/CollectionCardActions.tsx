"use client";

import { CollectionCardMenu } from "@/features/collections/_internal/components/CollectionCardMenu";
import { CollectionFavoriteButton } from "@/features/collections/_internal/components/CollectionFavoriteButton";
import { useCollectionFavorite } from "@/features/collections/_internal/components/hooks/use-collection-favorite";
import type { CollectionSummary } from "@/features/collections/types";

interface CollectionCardActionsProps {
  collection: CollectionSummary;
}

// The star and the menu's Favorite entry share one hook, so they cannot disagree.
export function CollectionCardActions({
  collection,
}: CollectionCardActionsProps) {
  const favorite = useCollectionFavorite(collection.id, collection.isFavorite);

  return (
    <div className="absolute top-2 right-2 z-10 flex items-center">
      <CollectionFavoriteButton
        favorite={favorite}
        label={`Favorite ${collection.name}`}
        size="icon-sm"
      />
      <CollectionCardMenu collection={collection} favorite={favorite} />
    </div>
  );
}
