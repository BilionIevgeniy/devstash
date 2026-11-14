"use client";
import { useTranslations } from "next-intl";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CollectionFavoriteButton } from "@/features/collections/_internal/components/CollectionFavoriteButton";
import { DeleteCollectionDialog } from "@/features/collections/_internal/components/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/features/collections/_internal/components/EditCollectionDialog";
import { useCollectionDialogs } from "@/features/collections/_internal/components/hooks/use-collection-dialogs";
import { useCollectionFavorite } from "@/features/collections/_internal/components/hooks/use-collection-favorite";
import type { CollectionSummary } from "@/features/collections/types";

interface CollectionHeaderActionsProps {
  collection: CollectionSummary;
}

export function CollectionHeaderActions({
  collection,
}: CollectionHeaderActionsProps) {
  const t = useTranslations("collections.actions");
  const { openDialog, editDialog, deleteDialog } = useCollectionDialogs();
  const favorite = useCollectionFavorite(collection.id, collection.isFavorite);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <CollectionFavoriteButton
        favorite={favorite}
        label={t("favorite")}
        size="icon"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("edit")}
        onClick={(event) => openDialog("edit", event.currentTarget)}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("delete")}
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
