import type { ReactNode } from "react";

import { ItemCopyButton } from "@/features/items/_internal/components/ItemCopyButton";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import type { ItemCardData } from "@/features/items/types";

interface ItemCardTriggerProps {
  item: ItemCardData;
  children: ReactNode;
}

// The drawer trigger of a card or row, with its copy button when the item has
// something to copy. The button reads the text on click.
export function ItemCardTrigger({ item, children }: ItemCardTriggerProps) {
  const { canCopy, ...drawerItem } = item;

  return (
    <ItemDrawerTrigger
      item={drawerItem}
      action={
        canCopy ? <ItemCopyButton itemId={item.id} title={item.title} /> : null
      }
    >
      {children}
    </ItemDrawerTrigger>
  );
}
