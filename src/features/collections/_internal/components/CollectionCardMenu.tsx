"use client";
import { useTranslations } from "next-intl";

import { useRef } from "react";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CollectionFavorite } from "@/features/collections/_internal/components/hooks/use-collection-favorite";
import { DeleteCollectionDialog } from "@/features/collections/_internal/components/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/features/collections/_internal/components/EditCollectionDialog";
import { useCollectionDialogs } from "@/features/collections/_internal/components/hooks/use-collection-dialogs";
import type { CollectionSummary } from "@/features/collections/types";
import { cn } from "@/lib/utils";

interface CollectionCardMenuProps {
  collection: CollectionSummary;
  favorite: CollectionFavorite;
}

export function CollectionCardMenu({
  collection,
  favorite,
}: CollectionCardMenuProps) {
  const t = useTranslations();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { isAnyOpen, openDialog, editDialog, deleteDialog } =
    useCollectionDialogs();

  // The dialog that opened takes the focus; the menu must not pull it back.
  function handleMenuCloseAutoFocus(event: Event) {
    if (isAnyOpen) event.preventDefault();
  }

  return (
    <>
      {/* Not modal: a modal menu and the dialog it opens would both lock the page. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("collections.actions.menuNamed", {
              name: collection.name,
            })}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={handleMenuCloseAutoFocus}
        >
          <DropdownMenuItem
            onSelect={() => openDialog("edit", triggerRef.current)}
          >
            <Pencil />
            {t("common.actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={favorite.isPending}
            onSelect={favorite.toggle}
          >
            <Star
              className={cn(
                favorite.isFavorite && "fill-yellow-400 text-yellow-400",
              )}
            />
            {t("collections.actions.favorite")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => openDialog("delete", triggerRef.current)}
          >
            <Trash2 />
            {t("common.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditCollectionDialog collection={collection} {...editDialog} />
      <DeleteCollectionDialog collection={collection} {...deleteDialog} />
    </>
  );
}
