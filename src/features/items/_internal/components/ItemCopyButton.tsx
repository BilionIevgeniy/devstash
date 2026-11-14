"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/common/CopyButton";
import { readItemDetail } from "@/features/items/_internal/components/fetch-item-detail";
import { copyValueOf } from "@/features/items/domain/item-fields";

interface ItemCopyButtonProps {
  itemId: string;
  title: string;
}

async function readCopyValue(
  queryClient: QueryClient,
  itemId: string,
): Promise<string> {
  const opened = await readItemDetail(queryClient, itemId);
  const value = copyValueOf(opened.item);
  if (value === null) throw new Error("Nothing to copy");
  return value;
}

// The copy button of a card or row. The list does not carry the content, so
// the text is read from the item's detail when the button is clicked, through
// the cache the drawer shares (ADR 0025). CopyButton shows any failure.
export function ItemCopyButton({ itemId, title }: ItemCopyButtonProps) {
  const t = useTranslations("items.actions");
  const queryClient = useQueryClient();
  return (
    <CopyButton
      getValue={() => readCopyValue(queryClient, itemId)}
      label={t("copyNamed", { title })}
      className="size-9 text-muted-foreground"
    />
  );
}
