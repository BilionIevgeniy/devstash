"use client";
import { useTranslations } from "next-intl";

import { useState, useTransition, type MouseEvent } from "react";
import { unstable_rethrow } from "next/navigation";

import { deleteAccount } from "@/features/account/_internal/actions/delete-account";
import { useClearReauthParam } from "@/features/account/_internal/components/hooks/use-clear-reauth-param";
import { reauthenticateWithGitHub } from "@/features/auth/actions/sign-in";
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
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ErrorCode, ErrorRef } from "@/i18n/error-codes";

interface DeleteAccountDialogProps {
  hasPassword: boolean;
  /** True when the account has no password and its sign-in is not recent. */
  requiresReauth: boolean;
  /** An error from the GitHub sign-in that brought the user back here. */
  returnError: ErrorCode | null;
}

export function DeleteAccountDialog({
  hasPassword,
  requiresReauth,
  returnError,
}: DeleteAccountDialogProps) {
  const tActions = useTranslations("common.actions");
  const t = useTranslations("account");
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [reauthNeeded, setReauthNeeded] = useState(requiresReauth);
  const [error, setError] = useState<ErrorRef | null>(
    returnError && { error: returnError },
  );
  useClearReauthParam(returnError !== null);

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // Keep the dialog open while working; a success redirects away.
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (reauthNeeded) {
          await reauthenticateWithGitHub();
          return;
        }

        const result = await deleteAccount({ password });
        if (result.success) return;
        // The dialog text already asks for a fresh GitHub sign-in.
        if (result.error === "reauthRequired") {
          setReauthNeeded(true);
          return;
        }
        setError(result);
      } catch (error) {
        // Both actions end in a redirect on success, which must go on.
        unstable_rethrow(error);
        setError({ error: "generic" });
      }
    });
  }

  return (
    <AlertDialog
      defaultOpen={returnError !== null}
      onOpenChange={(open) => {
        if (open) return;
        setPassword("");
        setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{t("deleteTitle")}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("dialogDescription")}
            {reauthNeeded && ` ${t("reauthNote")}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasPassword && (
          <ConfirmPasswordField value={password} onChange={setPassword} />
        )}
        {error && <DeleteError error={error} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {tActions("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={reauthNeeded ? "default" : "destructive"}
            disabled={isPending || (hasPassword && !password)}
            onClick={handleConfirm}
          >
            {reauthNeeded
              ? t("continueGithub")
              : isPending
                ? tActions("deleting")
                : t("deleteTitle")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteError({ error }: { error: ErrorRef }) {
  const errorText = useErrorText();
  return (
    <p role="alert" className="text-sm text-destructive">
      {errorText(error)}
    </p>
  );
}

interface ConfirmPasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
}

function ConfirmPasswordField({ value, onChange }: ConfirmPasswordFieldProps) {
  const t = useTranslations("account");
  return (
    <div className="space-y-2">
      <label htmlFor="delete-password" className="text-sm font-medium">
        {t("confirmPassword")}
      </label>
      <Input
        id="delete-password"
        type="password"
        autoComplete="current-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
