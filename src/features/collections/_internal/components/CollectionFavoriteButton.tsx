import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CollectionFavorite } from "@/features/collections/_internal/components/hooks/use-collection-favorite";
import { cn } from "@/lib/utils";

interface CollectionFavoriteButtonProps {
  favorite: CollectionFavorite;
  label: string;
  size: "icon" | "icon-sm";
}

// aria-disabled, not disabled: a disabled button would lose the keyboard focus
// each time it is pressed. The hook ignores a click during a save.
export function CollectionFavoriteButton({
  favorite,
  label,
  size,
}: CollectionFavoriteButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      aria-label={label}
      aria-pressed={favorite.isFavorite}
      aria-disabled={favorite.isPending}
      onClick={favorite.toggle}
      className={cn(
        "aria-disabled:opacity-50",
        favorite.isFavorite && "text-yellow-400 hover:text-yellow-400",
      )}
    >
      <Star className={cn(favorite.isFavorite && "fill-yellow-400")} />
    </Button>
  );
}
