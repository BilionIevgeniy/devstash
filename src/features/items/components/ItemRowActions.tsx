import { DeleteLockedItemButton } from "@/features/items/_internal/components/DeleteLockedItemButton";
import { ItemFavoriteButton } from "@/features/items/_internal/components/ItemFavoriteButton";
import { ItemPinButton } from "@/features/items/_internal/components/ItemPinButton";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import type { DashboardItem } from "@/features/items/types";

interface ItemRowActionsProps {
  item: DashboardItem;
  /** Which control takes this row off its list, and so offers Undo. */
  removes: "favorite" | "pin";
}

// Pin first: the star stays the rightmost column, on collection rows too. A
// locked row keeps only the control of its own list, so a file the user wants
// to keep can still leave the list, and delete.
export function ItemRowActions({ item, removes }: ItemRowActionsProps) {
  const { isLocked, focusListTop } = useItemDrawer();
  const locked = isLocked(item);

  return (
    <>
      {(!locked || removes === "pin") && (
        <ItemPinButton
          itemId={item.id}
          title={item.title}
          isPinned={item.isPinned}
          color={item.type.color}
          undoable={removes === "pin"}
        />
      )}
      {(!locked || removes === "favorite") && (
        <ItemFavoriteButton
          itemId={item.id}
          title={item.title}
          isFavorite={item.isFavorite}
          className="size-8"
          undoable={removes === "favorite"}
        />
      )}
      {locked && (
        <DeleteLockedItemButton
          itemId={item.id}
          title={item.title}
          returnFocus={focusListTop}
          className="size-8"
        />
      )}
    </>
  );
}
