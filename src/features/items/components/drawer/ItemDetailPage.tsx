"use client";
import { useTranslations } from "next-intl";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { useRemountOnReveal } from "@/components/common/hooks/use-remount-on-reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { systemTypeNameForSlug } from "@/features/item-types/domain/item-type";
import { ItemDrawerSkeleton } from "@/features/items/_internal/components/drawer/ItemDrawerSkeleton";
import { ItemDetailView } from "@/features/items/_internal/components/drawer/ItemDetailView";
import { deleteItem } from "@/features/items/actions/item";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import type {
  DashboardItem,
  ItemDetailJson,
  ItemEditMode,
} from "@/features/items/types";
import { isNavigationError } from "@/lib/errors/navigation-error";

interface ItemDetailPageProps {
  item: DashboardItem;
  detail: ItemDetailJson;
  canUseAi: boolean;
  editMode: ItemEditMode;
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
  canUseAi,
  editMode,
  listHref,
}: ItemDetailPageProps) {
  const t = useTranslations("items.toasts");
  const router = useRouter();
  const errorText = useErrorText();
  const syncItems = useSyncItemQueries();
  // Monaco's cleanup disposes the editor while the route is hidden, and it
  // does not come back on its own: the view mounts anew on return (ADR 0037).
  const revealKey = useRemountOnReveal();

  async function handleDelete(id: string): Promise<boolean> {
    try {
      const result = await deleteItem(id, { refresh: false });
      if (!result.success) {
        toast.error(errorText(result));
        return false;
      }
    } catch (error) {
      // The router is taking the user to sign-in: the dialog stays locked on
      // "Deleting…" until that page replaces this one.
      if (isNavigationError(error)) return true;
      toast.error(errorText("itemDeleteFailed"));
      return false;
    }

    await syncItems({ kind: "removed", id });
    toast.success(t("deleted"));
    router.replace(listHref);
    // The shared layout (the sidebar's counts) is not fetched again on a
    // navigation; the router runs this refresh after the replace, on the list.
    router.refresh();
    return true;
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      <ItemDetailView
        key={revealKey}
        item={item}
        detail={detail}
        canUseAi={canUseAi}
        editMode={editMode}
        variant="page"
        onDelete={handleDelete}
      />
    </div>
  );
}

// The page's loading.tsx gets no params, so the type is read from the URL
// here, for a file or image skeleton of the right size.
export function ItemDetailPageSkeleton() {
  const { type } = useParams<{ type: string }>();

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-lg border bg-card p-6">
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <ItemDrawerSkeleton typeName={systemTypeNameForSlug(type) ?? undefined} />
    </div>
  );
}
