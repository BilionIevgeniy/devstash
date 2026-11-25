import type { MouseEvent } from "react";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

interface DeleteConfirmFooterProps {
  isDeleting: boolean;
  /** Left out when there is nothing to confirm: Cancel alone. */
  onConfirm?: (event: MouseEvent<HTMLButtonElement>) => void;
}

// Cancel and Delete of a delete dialog: while the delete runs both are
// disabled and the button says so.
export function DeleteConfirmFooter({
  isDeleting,
  onConfirm,
}: DeleteConfirmFooterProps) {
  const t = useTranslations("common.actions");
  return (
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
      {onConfirm && (
        <AlertDialogAction
          variant="destructive"
          disabled={isDeleting}
          onClick={onConfirm}
        >
          {isDeleting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {t("deleting")}
            </>
          ) : (
            t("delete")
          )}
        </AlertDialogAction>
      )}
    </AlertDialogFooter>
  );
}
