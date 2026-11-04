import type { ReactNode } from "react";

import { ItemCopyButton } from "@/features/items/_internal/components/ItemCopyButton";
import { ItemFavoriteButton } from "@/features/items/_internal/components/ItemFavoriteButton";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import type { ItemCardData } from "@/features/items/types";

interface ItemCardTriggerProps {
  item: ItemCardData;
  children: ReactNode;
}

// The drawer trigger of a card or row, with its favorite button and, when the
// item has something to copy, its copy button, which reads the text on click.
export function ItemCardTrigger({ item, children }: ItemCardTriggerProps) {
  const { canCopy, ...drawerItem } = item;

  return (
    <ItemDrawerTrigger
      item={drawerItem}
      action={
        <div className="flex items-center">
          <ItemFavoriteButton
            itemId={item.id}
            title={item.title}
            isFavorite={item.isFavorite}
          />
          {canCopy && <ItemCopyButton itemId={item.id} title={item.title} />}
        </div>
      }
    >
      {children}
    </ItemDrawerTrigger>
  );
}
