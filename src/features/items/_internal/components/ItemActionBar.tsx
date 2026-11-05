import { Pencil, Pin, Star } from "lucide-react";

import { CopyButton } from "@/components/common/CopyButton";
import { Button } from "@/components/ui/button";
import {
  DeleteItemDialog,
  type ItemDeleteHandler,
} from "@/features/items/_internal/components/DeleteItemDialog";
import {
  useItemFavorite,
  useItemPin,
} from "@/features/items/components/hooks/use-item-drawer";
import type { DashboardItem } from "@/features/items/types";
import { cn } from "@/lib/utils";

// Five labelled buttons do not fit a phone, so there the labels are only read
// out. The active state stays visible through the filled icons.
const ACTION_LABEL = "sr-only sm:not-sr-only";

interface ItemActionBarProps {
  item: DashboardItem;
  canEdit: boolean;
  /** Null while the detail loads and for an upload, which has nothing to copy. */
  copyValue: string | null;
  onEdit: () => void;
  onDelete: ItemDeleteHandler;
}

export function ItemActionBar({
  item,
  canEdit,
  copyValue,
  onEdit,
  onDelete,
}: ItemActionBarProps) {
  const { id: itemId, title } = item;
  const typeColor = item.type.color;
  const favorite = useItemFavorite(itemId, item.isFavorite);
  const pin = useItemPin(itemId, item.isPinned);

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
        <span className={ACTION_LABEL}>Favorite</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-pressed={pin.isPinned}
        aria-disabled={pin.isPending}
        onClick={pin.toggle}
        className="aria-disabled:opacity-50"
        style={pin.isPinned && typeColor ? { color: typeColor } : undefined}
      >
        <Pin className={cn(pin.isPinned && "fill-current")} />
        <span className={ACTION_LABEL}>Pin</span>
      </Button>
      {copyValue !== null && (
        <CopyButton value={copyValue} label={`Copy ${title}`}>
          <span className={ACTION_LABEL}>Copy</span>
        </CopyButton>
      )}
      <Button
        type="button"
        variant="ghost"
        className="ml-auto"
        disabled={!canEdit}
        onClick={onEdit}
      >
        <Pencil />
        <span className={ACTION_LABEL}>Edit</span>
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
