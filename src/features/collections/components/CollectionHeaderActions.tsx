"use client";

import { Pencil, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteCollectionDialog } from "@/features/collections/_internal/components/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/features/collections/_internal/components/EditCollectionDialog";
import { useCollectionDialogs } from "@/features/collections/_internal/components/hooks/use-collection-dialogs";
import type { CollectionSummary } from "@/features/collections/types";
import { cn } from "@/lib/utils";

interface CollectionHeaderActionsProps {
  collection: CollectionSummary;
}

export function CollectionHeaderActions({
  collection,
}: CollectionHeaderActionsProps) {
  const { openDialog, editDialog, deleteDialog } = useCollectionDialogs();
  const { isFavorite } = collection;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Favorite"
        aria-pressed={isFavorite}
        disabled
        className={cn(isFavorite && "text-yellow-400")}
      >
        <Star className={cn(isFavorite && "fill-yellow-400")} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Edit collection"
        onClick={(event) => openDialog("edit", event.currentTarget)}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Delete collection"
        className="text-destructive hover:text-destructive"
        onClick={(event) => openDialog("delete", event.currentTarget)}
      >
        <Trash2 />
      </Button>
      <EditCollectionDialog collection={collection} {...editDialog} />
      <DeleteCollectionDialog
        collection={collection}
        leaveTo="/collections"
        {...deleteDialog}
      />
    </div>
  );
}
