"use client";
import { useTranslations } from "next-intl";

import { useState, useTransition, type MouseEvent } from "react";
import { unstable_rethrow } from "next/navigation";

import { deleteAccount } from "@/features/account/_internal/actions/delete-account";
import { DeleteError } from "@/features/account/_internal/components/DeleteError";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import type { ErrorRef } from "@/i18n/error-codes";

// The body of the delete dialog for an account with a password.
export function PasswordDeletion() {
  const tActions = useTranslations("common.actions");
  const t = useTranslations("account");
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ErrorRef | null>(null);

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // Keep the dialog open while working; a success redirects away.
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteAccount({ password });
        if (!result.success) setError(result);
      } catch (error) {
        // A success ends in a redirect, which must go on.
        unstable_rethrow(error);
        setError({ error: "generic" });
      }
    });
  }

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="delete-password" className="text-sm font-medium">
          {t("confirmPassword")}
        </label>
        <Input
          id="delete-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {error && <DeleteError error={error} />}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>
          {tActions("cancel")}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={isPending || !password}
          onClick={handleConfirm}
        >
          {isPending ? tActions("deleting") : t("deleteTitle")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
