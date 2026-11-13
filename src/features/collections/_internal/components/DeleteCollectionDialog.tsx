import { useRef, useTransition, type MouseEvent } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
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
import type { CollectionDialogState } from "@/features/collections/_internal/components/hooks/use-collection-dialogs";
import { deleteCollection } from "@/features/collections/actions/collection";
import type { CollectionSummary } from "@/features/collections/types";

const DELETED_MESSAGE = "Collection deleted";
const DELETE_FAILED_MESSAGE = "Couldn't delete the collection";

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
  const router = useRouter();
  const [isDeleting, startDeleting] = useTransition();
  const deletedRef = useRef(false);

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
    startDeleting(async () => {
      try {
        const result = await deleteCollection(collection.id, {
          refresh: leaveTo === undefined,
        });
        if (result.success) {
          deletedRef.current = true;
          // Wrapped again after the await: "Deleting…" stays until the commit
          // that brings the page without this collection.
          startDeleting(finishDelete);
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on.
        unstable_rethrow(error);
        toast.error(DELETE_FAILED_MESSAGE);
      }
    });
  }

  // Radix calls this after a close and after an unmount, which is how the
  // dialog ends here: the fresh page no longer has the card or the page it
  // sits in, so it goes without an exit animation and the toast comes then.
  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    returnFocus();
    if (!deletedRef.current) return;
    deletedRef.current = false;
    toast.success(DELETED_MESSAGE);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent onCloseAutoFocus={handleCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{collection.name}&rdquo; will be permanently deleted. Its
            items are kept and only leave this collection.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
