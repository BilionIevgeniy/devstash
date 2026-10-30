import { Copy, Pencil, Pin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DeleteItemDialog,
  type ItemDeleteHandler,
} from "@/features/items/_internal/components/DeleteItemDialog";
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

// Only Edit and Delete work so far: the other actions are wired up in a later
// feature.
export function ItemActionBar({
  itemId,
  title,
  isFavorite,
  isPinned,
  canEdit,
  onEdit,
  onDelete,
}: ItemActionBarProps) {
  return (
    <div className="flex items-center gap-1 border-b px-6 py-3">
      <Button
        type="button"
        variant="ghost"
        aria-pressed={isFavorite}
        className={cn(isFavorite && "text-yellow-400 hover:text-yellow-400")}
      >
        <Star className={cn(isFavorite && "fill-yellow-400")} />
        Favorite
      </Button>
      <Button type="button" variant="ghost" aria-pressed={isPinned}>
        <Pin className={cn(isPinned && "fill-current")} />
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
