import type { MouseEvent } from "react";
import { Loader2Icon } from "lucide-react";

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteItemConfirmProps {
  title: string;
  isDeleting: boolean;
  onConfirm: (event: MouseEvent<HTMLButtonElement>) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

// The question both item deletes ask. Each keeps its own state: the drawer's
// can be optimistic, a locked item's always waits for the server.
export function DeleteItemConfirm({
  title,
  isDeleting,
  onConfirm,
  onCloseAutoFocus,
}: DeleteItemConfirmProps) {
  return (
    <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
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
          onClick={onConfirm}
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
  );
}
