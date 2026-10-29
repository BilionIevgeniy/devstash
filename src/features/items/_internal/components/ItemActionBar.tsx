import { Copy, Pencil, Pin, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ItemActionBarProps {
  isFavorite: boolean;
  isPinned: boolean;
  canEdit: boolean;
  onEdit: () => void;
}

// Only Edit works so far: the other actions are wired up in a later feature.
export function ItemActionBar({
  isFavorite,
  isPinned,
  canEdit,
  onEdit,
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
}
