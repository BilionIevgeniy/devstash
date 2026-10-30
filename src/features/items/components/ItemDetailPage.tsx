"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  DELETED_MESSAGE,
  DELETE_FAILED_MESSAGE,
} from "@/features/items/_internal/components/DeleteItemDialog";
import { ItemDetailView } from "@/features/items/_internal/components/ItemDetailView";
import { deleteItem } from "@/features/items/actions/item";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

interface ItemDetailPageProps {
  item: DashboardItem;
  detail: ItemDetailJson;
  listHref: string;
}

// The full item page, shown on a reload or a shared link. There is no card to
// hide here, so the delete is not optimistic: the dialog waits for the result
// and stays open until the list replaces the page. The action skips its
// refresh, which would render this page's 404, and the history entry is
// replaced, so Back does not lead to the deleted item.
export function ItemDetailPage({
  item,
  detail,
  listHref,
}: ItemDetailPageProps) {
  const router = useRouter();

  async function handleDelete(id: string): Promise<boolean> {
    try {
      const result = await deleteItem(id, { refresh: false });
      if (!result.success) {
        toast.error(result.error ?? DELETE_FAILED_MESSAGE);
        return false;
      }
    } catch {
      toast.error(DELETE_FAILED_MESSAGE);
      return false;
    }

    toast.success(DELETED_MESSAGE);
    router.replace(listHref);
    // The shared layout (the sidebar's counts) is not fetched again on a
    // navigation; the router runs this refresh after the replace, on the list.
    router.refresh();
    return true;
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      <ItemDetailView
        item={item}
        detail={detail}
        variant="page"
        onDelete={handleDelete}
      />
    </div>
  );
}
