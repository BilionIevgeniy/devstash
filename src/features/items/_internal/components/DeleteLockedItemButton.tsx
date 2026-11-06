"use client";

import { useRef, useState, useTransition, type MouseEvent } from "react";
import { unstable_rethrow } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DeleteItemConfirm } from "@/features/items/_internal/components/DeleteItemConfirm";
import {
  DELETED_MESSAGE,
  DELETE_FAILED_MESSAGE,
} from "@/features/items/_internal/components/DeleteItemDialog";
import { deleteItem } from "@/features/items/actions/item";
import { cn } from "@/lib/utils";

interface DeleteLockedItemButtonProps {
  itemId: string;
  title: string;
  /** Where the focus goes once the deleted row is gone. */
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
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const deletedRef = useRef(false);

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    startDeleting(async () => {
      try {
        const result = await deleteItem(itemId);
        if (result.success) {
          deletedRef.current = true;
          // Wrapped again after the await: "Deleting…" stays until the commit
          // that brings the page without this item.
          startDeleting(() => setIsOpen(false));
        } else {
          toast.error(result.error ?? DELETE_FAILED_MESSAGE);
        }
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on.
        unstable_rethrow(error);
        toast.error(DELETE_FAILED_MESSAGE);
      }
    });
  }

  // Radix calls this after a close and after an unmount. Cancel and Esc keep its
  // default, which returns the focus to the button. The toast waits for here,
  // so it does not run ahead of the page without the item.
  function handleCloseAutoFocus(event: Event) {
    if (!deletedRef.current) return;
    event.preventDefault();
    deletedRef.current = false;
    returnFocus();
    toast.success(DELETED_MESSAGE);
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
          aria-label={`Delete ${title}`}
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
