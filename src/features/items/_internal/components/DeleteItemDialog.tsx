"use client";

import { useState, type MouseEvent } from "react";
import { Loader2Icon, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export const DELETED_MESSAGE = "Item deleted";
export const DELETE_FAILED_MESSAGE = "Couldn't delete the item.";

/**
 * Returns nothing to delete optimistically: the dialog closes at once. Returns
 * a promise to keep the dialog open until it settles: `true` means the caller
 * is leaving the page, `false` that the delete failed and the dialog stays.
 */
export type ItemDeleteHandler = (id: string) => void | Promise<boolean>;

interface DeleteItemDialogProps {
  itemId: string;
  title: string;
  disabled: boolean;
  onDelete: ItemDeleteHandler;
}

export function DeleteItemDialog({
  itemId,
  title,
  disabled,
  onDelete,
}: DeleteItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    const result = onDelete(itemId);
    if (!result) return;

    event.preventDefault();
    setIsDeleting(true);
    if (!(await result)) setIsDeleting(false);
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
          className="text-destructive hover:text-destructive"
          disabled={disabled}
        >
          <Trash2 />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{title}&rdquo; will be permanently deleted. This cannot be
            undone.
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
