import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
  return (
    <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("items.delete.title")}</AlertDialogTitle>
        <AlertDialogDescription>
          {t("items.delete.description", { title })}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>
          {t("common.actions.cancel")}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={isDeleting}
          onClick={onConfirm}
        >
          {isDeleting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {t("common.actions.deleting")}
            </>
          ) : (
            t("common.actions.delete")
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
