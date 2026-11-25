import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";

import { DeleteConfirmFooter } from "@/components/common/DeleteConfirmFooter";
import {
  AlertDialogContent,
  AlertDialogDescription,
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
  const t = useTranslations();
  return (
    <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("items.delete.title")}</AlertDialogTitle>
        <AlertDialogDescription>
          {t("items.delete.description", { title })}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <DeleteConfirmFooter isDeleting={isDeleting} onConfirm={onConfirm} />
    </AlertDialogContent>
  );
}
