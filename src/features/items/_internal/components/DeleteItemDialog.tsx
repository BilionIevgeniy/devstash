"use client";

import { useState, type MouseEvent } from "react";
import { Trash2 } from "lucide-react";

import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DeleteItemConfirm } from "@/features/items/_internal/components/DeleteItemConfirm";

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
          aria-label={`Delete ${title}`}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <DeleteItemConfirm
        title={title}
        isDeleting={isDeleting}
        onConfirm={handleConfirm}
      />
    </AlertDialog>
  );
}
