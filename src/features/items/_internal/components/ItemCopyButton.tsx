"use client";

import { CopyButton } from "@/components/common/CopyButton";
import { fetchItemDetail } from "@/features/items/_internal/components/fetch-item-detail";
import { copyValueOf } from "@/features/items/domain/item-fields";

interface ItemCopyButtonProps {
  itemId: string;
  title: string;
}

async function readCopyValue(itemId: string): Promise<string> {
  const detail = await fetchItemDetail(itemId);
  const value = detail && copyValueOf(detail);
  if (value === null) throw new Error("Nothing to copy");
  return value;
}

// The copy button of a card or row. The list does not carry the content, so
// the text is read from the item's detail when the button is clicked.
export function ItemCopyButton({ itemId, title }: ItemCopyButtonProps) {
  return (
    <CopyButton
      getValue={() => readCopyValue(itemId)}
      label={`Copy ${title}`}
      className="size-9 text-muted-foreground"
    />
  );
}
