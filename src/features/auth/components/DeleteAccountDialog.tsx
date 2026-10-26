"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { toast } from "sonner";

import { deleteAccount } from "@/features/auth/_internal/actions/account";
import { reauthenticateWithGitHub } from "@/features/auth/actions/auth";
import { REAUTH_REQUIRED_MESSAGE } from "@/features/auth/domain/reauth";
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
import { Input } from "@/components/ui/input";

const DEFAULT_ERROR = "Something went wrong. Please try again.";

interface DeleteAccountDialogProps {
  hasPassword: boolean;
  /** True when the account has no password and its sign-in is not recent. */
  requiresReauth: boolean;
}

export function DeleteAccountDialog({
  hasPassword,
  requiresReauth,
}: DeleteAccountDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [reauthNeeded, setReauthNeeded] = useState(requiresReauth);

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // Keep the dialog open while working; a success redirects away.
    event.preventDefault();
    startTransition(async () => {
      if (reauthNeeded) {
        await reauthenticateWithGitHub();
        return;
      }

      const result = await deleteAccount({ password });
      if (result.success) return;
      if (result.error === REAUTH_REQUIRED_MESSAGE) setReauthNeeded(true);
      toast.error(result.error ?? DEFAULT_ERROR);
    });
  }

  return (
    <AlertDialog onOpenChange={(open) => !open && setPassword("")}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your account and all of your items,
            collections and tags. This cannot be undone.
            {reauthNeeded &&
              ` ${REAUTH_REQUIRED_MESSAGE}, then come back here to finish.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasPassword && (
          <div className="space-y-2">
            <label htmlFor="delete-password" className="text-sm font-medium">
              Enter your password to confirm
            </label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={reauthNeeded ? "default" : "destructive"}
            disabled={isPending || (hasPassword && !password)}
            onClick={handleConfirm}
          >
            {reauthNeeded
              ? "Continue with GitHub"
              : isPending
                ? "Deleting…"
                : "Delete account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
