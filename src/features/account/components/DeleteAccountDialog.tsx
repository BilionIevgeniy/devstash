"use client";
import { useTranslations } from "next-intl";

import { EmailLinkDeletion } from "@/features/account/_internal/components/EmailLinkDeletion";
import { PasswordDeletion } from "@/features/account/_internal/components/PasswordDeletion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteAccountDialogProps {
  hasPassword: boolean;
  /** The account's address, where an account without a password gets its link. */
  email: string;
}

// An account with a password confirms with it here. One without (GitHub only)
// gets a link at its address and deletes on the page the link opens. The body
// unmounts when the dialog closes, so it opens again from the start.
export function DeleteAccountDialog({
  hasPassword,
  email,
}: DeleteAccountDialogProps) {
  const t = useTranslations("account");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{t("deleteTitle")}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("dialogDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasPassword ? (
          <PasswordDeletion />
        ) : (
          <EmailLinkDeletion email={email} />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
