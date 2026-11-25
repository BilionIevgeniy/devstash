import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DeleteConfirmFooter } from "@/components/common/DeleteConfirmFooter";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useDialogControl,
  type DialogControl,
} from "@/components/common/hooks/use-dialog-control";
import { deleteCollection } from "@/features/collections/actions/collection";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import type { CollectionSummary } from "@/features/collections/types";

interface DeleteCollectionDialogProps extends DialogControl {
  collection: CollectionSummary;
  /** The page to leave for: the current one is the collection being deleted. */
  leaveTo?: string;
}

export function DeleteCollectionDialog({
  collection,
  leaveTo,
  ...control
}: DeleteCollectionDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  // The dialog can also end by unmounting: the fresh page no longer has the
  // card or the page it sits in. Radix reports that as a close too.
  const {
    isOpen,
    isPending: isDeleting,
    run,
    close,
    handleOpenChange,
    handleCloseAutoFocus,
  } = useDialogControl(
    () => toast.success(t("collections.toasts.deleted")),
    control,
  );
  const syncItems = useSyncItemQueries();

  function finishDelete() {
    if (leaveTo === undefined) {
      close();
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

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent onCloseAutoFocus={handleCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("collections.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("collections.delete.description", { name: collection.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <DeleteConfirmFooter
          isDeleting={isDeleting}
          onConfirm={handleConfirm}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
