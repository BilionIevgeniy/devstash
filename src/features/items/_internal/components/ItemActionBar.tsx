import { Copy, Pencil, Pin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DeleteItemDialog,
  type ItemDeleteHandler,
} from "@/features/items/_internal/components/DeleteItemDialog";
import {
  useItemFavorite,
  useItemPin,
} from "@/features/items/components/hooks/use-item-drawer";
import { cn } from "@/lib/utils";

interface ItemActionBarProps {
  itemId: string;
  title: string;
  isFavorite: boolean;
  isPinned: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: ItemDeleteHandler;
}

// Copy is wired up in a later feature.
export function ItemActionBar({
  itemId,
  title,
  isFavorite,
  isPinned,
  canEdit,
  onEdit,
  onDelete,
}: ItemActionBarProps) {
  const favorite = useItemFavorite(itemId, isFavorite);
  const pin = useItemPin(itemId, isPinned);

  return (
    <div className="flex items-center gap-1 border-b px-6 py-3">
      <Button
        type="button"
        variant="ghost"
        aria-pressed={favorite.isFavorite}
        aria-disabled={favorite.isPending}
        onClick={favorite.toggle}
        className={cn(
          "aria-disabled:opacity-50",
          favorite.isFavorite && "text-yellow-400 hover:text-yellow-400",
        )}
      >
        <Star className={cn(favorite.isFavorite && "fill-yellow-400")} />
        Favorite
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-pressed={pin.isPinned}
        aria-disabled={pin.isPending}
        onClick={pin.toggle}
        className="aria-disabled:opacity-50"
      >
        <Pin className={cn(pin.isPinned && "fill-current")} />
        Pin
      </Button>
      <Button type="button" variant="ghost">
        <Copy />
        Copy
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="ml-auto"
        disabled={!canEdit}
        onClick={onEdit}
      >
        <Pencil />
        Edit
      </Button>
      <DeleteItemDialog
        itemId={itemId}
        title={title}
        disabled={!canEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
