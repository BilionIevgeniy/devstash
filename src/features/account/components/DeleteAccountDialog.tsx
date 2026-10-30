"use client";

import { useState, useTransition, type MouseEvent } from "react";

import { deleteAccount } from "@/features/account/_internal/actions/delete-account";
import { reauthenticateWithGitHub } from "@/features/auth/actions/sign-in";
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
  const [error, setError] = useState<string | null>(null);

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // Keep the dialog open while working; a success redirects away.
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      if (reauthNeeded) {
        await reauthenticateWithGitHub();
        return;
      }

      const result = await deleteAccount({ password });
      if (result.success) return;
      // The dialog text already asks for a fresh GitHub sign-in.
      if (result.error === REAUTH_REQUIRED_MESSAGE) {
        setReauthNeeded(true);
        return;
      }
      setError(result.error ?? DEFAULT_ERROR);
    });
  }

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (open) return;
        setPassword("");
        setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your account and all of your items,
            collections, tags, files and images. This cannot be undone.
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
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
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
