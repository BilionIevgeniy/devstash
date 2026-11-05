import { ItemFavoriteButton } from "@/features/items/_internal/components/ItemFavoriteButton";
import { ItemPinButton } from "@/features/items/_internal/components/ItemPinButton";
import type { DashboardItem } from "@/features/items/types";

interface ItemRowActionsProps {
  item: DashboardItem;
  /** Which control takes this row off its list, and so offers Undo. */
  removes: "favorite" | "pin";
}

// Pin first: the star stays the rightmost column, on collection rows too.
export function ItemRowActions({ item, removes }: ItemRowActionsProps) {
  return (
    <>
      <ItemPinButton
        itemId={item.id}
        title={item.title}
        isPinned={item.isPinned}
        color={item.type.color}
        undoable={removes === "pin"}
      />
      <ItemFavoriteButton
        itemId={item.id}
        title={item.title}
        isFavorite={item.isFavorite}
        className="size-8"
        undoable={removes === "favorite"}
      />
    </>
  );
}
