"use client";

import { Pin } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useItemPin } from "@/features/items/components/hooks/use-item-drawer";
import { typeInk } from "@/features/item-types/components/type-color";
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
  const t = useTranslations("items.actions");
  const pin = useItemPin(itemId, isPinned, { undoable });
  const ink = pin.isPinned ? typeInk(color) : undefined;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t("pinNamed", { title })}
      aria-pressed={pin.isPinned}
      aria-disabled={pin.isPending}
      onClick={pin.toggle}
      // The ghost variant's hover would take the colour away from a set pin.
      className={cn(
        "text-muted-foreground aria-disabled:opacity-50",
        ink && `${ink.className} hover:text-type`,
      )}
      style={ink?.style}
    >
      <Pin className={cn(pin.isPinned && "fill-current")} />
    </Button>
  );
}
