"use client";

import { useTransition, type MouseEvent } from "react";
import { toast } from "sonner";

import { deleteAccount } from "@/features/auth/_internal/actions/account";
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

const DEFAULT_ERROR = "Something went wrong. Please try again.";

export function DeleteAccountDialog() {
  const [isPending, startTransition] = useTransition();

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    // Keep the dialog open while deleting; a success redirects to /sign-in.
    event.preventDefault();
    startTransition(async () => {
      const result = await deleteAccount();
      if (!result.success) toast.error(result.error ?? DEFAULT_ERROR);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your account and all of your items,
            collections and tags. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting…" : "Delete account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
