"use client";

import { useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useSubmitDialog } from "@/components/common/hooks/use-submit-dialog";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DeleteItemConfirm } from "@/features/items/_internal/components/delete/DeleteItemConfirm";
import {
  captureFocusTargets,
  NO_FOCUS_TARGETS,
  restoreFocus,
  type FocusTargets,
} from "@/features/items/_internal/components/drawer/focus-targets";
import { deleteItem } from "@/features/items/actions/item";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import { cn } from "@/lib/utils";

interface DeleteLockedItemButtonProps {
  itemId: string;
  title: string;
  /**
   * Where the focus goes once the deleted row is gone and no row is left
   * beside it.
   */
  returnFocus: () => void;
  className?: string;
}

// The one thing a locked item still does. It waits for the server, unlike the
// drawer's optimistic delete: this dialog lives in the row it removes, and the
// form must stay open on a failure. The same shape as DeleteCollectionDialog.
export function DeleteLockedItemButton({
  itemId,
  title,
  returnFocus,
  className,
}: DeleteLockedItemButtonProps) {
  const t = useTranslations("items");
  const [isOpen, setIsOpen] = useState(false);
  const focusTargetsRef = useRef<FocusTargets>(NO_FOCUS_TARGETS);
  const { isPending: isDeleting, run, takeDone } = useSubmitDialog();
  const syncItems = useSyncItemQueries();

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    run(() => deleteItem(itemId), {
      onSuccess: () => setIsOpen(false),
      failCode: "itemDeleteFailed",
      sync: () => syncItems({ kind: "removed", id: itemId }),
    });
  }

  // Radix calls this after a close and after an unmount. Cancel and Esc keep its
  // default, which returns the focus to the button. The toast waits for here,
  // so it does not run ahead of the page without the item. The rows around
  // this one were read when the dialog opened, while the row was still there.
  function handleCloseAutoFocus(event: Event) {
    if (!takeDone()) return;
    event.preventDefault();
    restoreFocus(focusTargetsRef.current, returnFocus, { skipOpener: true });
    toast.success(t("toasts.deleted"));
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!isDeleting) setIsOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("text-destructive hover:text-destructive", className)}
          aria-label={t("actions.deleteNamed", { title })}
          onClick={(event) => {
            focusTargetsRef.current = captureFocusTargets(event.currentTarget);
          }}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <DeleteItemConfirm
        title={title}
        isDeleting={isDeleting}
        onConfirm={handleConfirm}
        onCloseAutoFocus={handleCloseAutoFocus}
      />
    </AlertDialog>
  );
}
