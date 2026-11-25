"use client";
import { useTranslations } from "next-intl";

import { useState, type MouseEvent } from "react";

import { useDeleteAccount } from "@/features/account/_internal/components/hooks/use-delete-account";
import { useReportPending } from "@/features/account/_internal/components/hooks/use-report-pending";
import { DeleteError } from "@/features/account/_internal/components/DeleteError";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useRemountOnReveal } from "@/components/common/hooks/use-remount-on-reveal";

interface PasswordDeletionProps {
  /** The dialog stays open while the delete runs. */
  onPendingChange: (isPending: boolean) => void;
}

// Mounted anew when its route shows again (useRemountOnReveal, ADR 0037): the
// route stays mounted while hidden, and a password typed and left must not
// wait in the page for the user's return.
export function PasswordDeletion(props: PasswordDeletionProps) {
  return <PasswordDeletionBody key={useRemountOnReveal()} {...props} />;
}

// The body of the delete dialog for an account with a password.
function PasswordDeletionBody({ onPendingChange }: PasswordDeletionProps) {
  const tActions = useTranslations("common.actions");
  const t = useTranslations("account");
  const [password, setPassword] = useState("");
  const { isPending, error, submit } = useDeleteAccount();
  useReportPending(isPending, onPendingChange);

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // Keep the dialog open while working; a success redirects away.
    event.preventDefault();
    submit({ password });
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
