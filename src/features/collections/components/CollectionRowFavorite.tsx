"use client";

import { CollectionFavoriteButton } from "@/features/collections/_internal/components/CollectionFavoriteButton";
import { useCollectionFavorite } from "@/features/collections/_internal/components/hooks/use-collection-favorite";

interface CollectionRowFavoriteProps {
  collectionId: string;
  name: string;
}

// The star of a row on the favorites page, so it starts set, and taking it off
// removes the row: the toast offers Undo.
export function CollectionRowFavorite({
  collectionId,
  name,
}: CollectionRowFavoriteProps) {
  const favorite = useCollectionFavorite(collectionId, true, {
    undoable: true,
  });

  return (
    <CollectionFavoriteButton
      favorite={favorite}
      label={`Favorite ${name}`}
      size="icon"
    />
  );
}
