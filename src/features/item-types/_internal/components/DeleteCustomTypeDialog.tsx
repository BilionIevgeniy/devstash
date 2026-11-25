import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useDialogControl } from "@/components/common/hooks/use-dialog-control";
import { DeleteConfirmFooter } from "@/components/common/DeleteConfirmFooter";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
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
  // The row and its trigger are gone with the fresh page, so the focus is
  // left where the browser puts it.
  const {
    isOpen,
    isPending,
    run,
    close,
    handleOpenChange,
    handleCloseAutoFocus,
  } = useDialogControl(() => toast.success(t("customTypes.toasts.deleted")));
  const hasItems = type.itemCount > 0;

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    run(() => deleteCustomType(type.id), {
      onSuccess: close,
      failCode: "customTypeDeleteFailed",
      sync,
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
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
        <DeleteConfirmFooter
          isDeleting={isPending}
          onConfirm={hasItems ? undefined : handleConfirm}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
