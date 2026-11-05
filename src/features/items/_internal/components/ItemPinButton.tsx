"use client";

import { Pin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useItemPin } from "@/features/items/components/hooks/use-item-drawer";
import { cn } from "@/lib/utils";

interface ItemPinButtonProps {
  itemId: string;
  title: string;
  isPinned: boolean;
  /** The colour of the item's type, for a set pin. */
  color?: string;
  /** Unpinning takes the row off the list, so the toast offers Undo. */
  undoable?: boolean;
}

// aria-disabled, not disabled: a disabled button would lose the keyboard focus
// each time it is pressed. The hook ignores a click during a save.
export function ItemPinButton({
  itemId,
  title,
  isPinned,
  color,
  undoable,
}: ItemPinButtonProps) {
  const pin = useItemPin(itemId, isPinned, { undoable });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Pin ${title}`}
      aria-pressed={pin.isPinned}
      aria-disabled={pin.isPending}
      onClick={pin.toggle}
      className="text-muted-foreground aria-disabled:opacity-50"
      style={pin.isPinned && color ? { color } : undefined}
    >
      <Pin className={cn(pin.isPinned && "fill-current")} />
    </Button>
  );
}
