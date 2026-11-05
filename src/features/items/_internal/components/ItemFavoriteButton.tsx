"use client";

import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useItemFavorite } from "@/features/items/components/hooks/use-item-drawer";
import { cn } from "@/lib/utils";

interface ItemFavoriteButtonProps {
  itemId: string;
  title: string;
  isFavorite: boolean;
  className?: string;
  /** Taking the star off removes the row from its list, so the toast offers Undo. */
  undoable?: boolean;
}

// aria-disabled, not disabled: a disabled button would lose the keyboard focus
// each time it is pressed. The hook ignores a click during a save.
export function ItemFavoriteButton({
  itemId,
  title,
  isFavorite,
  className,
  undoable,
}: ItemFavoriteButtonProps) {
  const favorite = useItemFavorite(itemId, isFavorite, { undoable });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={`Favorite ${title}`}
      aria-pressed={favorite.isFavorite}
      aria-disabled={favorite.isPending}
      onClick={favorite.toggle}
      className={cn(
        "text-muted-foreground aria-disabled:opacity-50",
        favorite.isFavorite && "text-yellow-400 hover:text-yellow-400",
        className,
      )}
    >
      <Star className={cn(favorite.isFavorite && "fill-yellow-400")} />
    </Button>
  );
}
