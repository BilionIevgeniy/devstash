import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSubmitDialog } from "@/components/common/hooks/use-submit-dialog";
import type { CollectionDialogState } from "@/features/collections/_internal/components/hooks/use-collection-dialogs";
import { deleteCollection } from "@/features/collections/actions/collection";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import type { CollectionSummary } from "@/features/collections/types";

interface DeleteCollectionDialogProps extends CollectionDialogState {
  collection: CollectionSummary;
  /** The page to leave for: the current one is the collection being deleted. */
  leaveTo?: string;
}

export function DeleteCollectionDialog({
  collection,
  leaveTo,
  open,
  onOpenChange,
  returnFocus,
}: DeleteCollectionDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const { isPending: isDeleting, run, takeDone } = useSubmitDialog();
  const syncItems = useSyncItemQueries();

  function handleOpenChange(next: boolean) {
    if (!isDeleting) onOpenChange(next);
  }

  function finishDelete() {
    if (leaveTo === undefined) {
      onOpenChange(false);
      return;
    }
    router.replace(leaveTo);
    // The shared layout (the sidebar) is not fetched again on a navigation;
    // the router runs this refresh after the replace, on the list.
    router.refresh();
  }

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    run(
      () => deleteCollection(collection.id, { refresh: leaveTo === undefined }),
      {
        onSuccess: finishDelete,
        failCode: "collectionDeleteFailed",
        sync: () => syncItems({ kind: "collections" }),
      },
    );
  }

  // Radix calls this after a close and after an unmount, which is how the
  // dialog ends here: the fresh page no longer has the card or the page it
  // sits in, so it goes without an exit animation and the toast comes then.
  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    returnFocus();
    if (takeDone()) toast.success(t("collections.toasts.deleted"));
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent onCloseAutoFocus={handleCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("collections.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("collections.delete.description", { name: collection.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {t("common.actions.deleting")}
              </>
            ) : (
              t("common.actions.delete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
