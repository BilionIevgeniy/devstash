import { useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2Icon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useSubmitDialog } from "@/components/common/hooks/use-submit-dialog";
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
import { deleteCustomType } from "@/features/item-types/actions/custom-type";
import type { CustomTypeRow } from "@/features/item-types/types";

interface DeleteCustomTypeDialogProps {
  type: CustomTypeRow;
  sync?: () => Promise<void>;
}

// A type with items cannot go (Item.typeId is required): the dialog says so
// and offers no delete; the service refuses it as well.
export function DeleteCustomTypeDialog({
  type,
  sync,
}: DeleteCustomTypeDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const { isPending, run, takeDone } = useSubmitDialog();
  const hasItems = type.itemCount > 0;

  function handleOpenChange(next: boolean) {
    if (!isPending) setOpen(next);
  }

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    run(() => deleteCustomType(type.id), {
      onSuccess: () => setOpen(false),
      failCode: "customTypeDeleteFailed",
      sync,
    });
  }

  // The row and its trigger are gone with the fresh page, so the focus is
  // left where the browser puts it; the toast follows the close.
  function handleCloseAutoFocus() {
    if (takeDone()) toast.success(t("customTypes.toasts.deleted"));
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("customTypes.deleteLabel", { name: type.name })}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onCloseAutoFocus={handleCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("customTypes.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {hasItems
              ? t("customTypes.delete.hasItems", {
                  name: type.name,
                  count: type.itemCount,
                })
              : t("customTypes.delete.description", { name: type.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("common.actions.cancel")}
          </AlertDialogCancel>
          {!hasItems && (
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("common.actions.deleting")}
                </>
              ) : (
                t("common.actions.delete")
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
