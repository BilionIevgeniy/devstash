import type { ReactNode } from "react";

import { CopyButton } from "@/components/common/CopyButton";
import { ItemDrawerTrigger } from "@/features/items/components/ItemDrawerTrigger";
import type { ItemCardData } from "@/features/items/types";

interface ItemCardTriggerProps {
  item: ItemCardData;
  children: ReactNode;
}

// The drawer trigger of a card or row, with its copy button when the item has
// something to copy. The value goes to the button only, so the content is sent
// to the browser once.
export function ItemCardTrigger({ item, children }: ItemCardTriggerProps) {
  const { copyValue, ...drawerItem } = item;

  return (
    <ItemDrawerTrigger
      item={drawerItem}
      action={
        copyValue ? (
          <CopyButton
            value={copyValue}
            label={`Copy ${item.title}`}
            className="size-9 text-muted-foreground"
          />
        ) : null
      }
    >
      {children}
    </ItemDrawerTrigger>
  );
}
