"use client";
import { useTranslations } from "next-intl";

import { useState, type SubmitEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useSubmitDialog } from "@/components/common/hooks/use-submit-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CollectionFields } from "@/features/collections/_internal/components/CollectionFields";
import type { CollectionDialogState } from "@/features/collections/_internal/components/hooks/use-collection-dialogs";
import { createCollection } from "@/features/collections/actions/collection";
import type { CollectionFormValues } from "@/features/collections/domain/collection-fields";

const EMPTY_VALUES: CollectionFormValues = { name: "", description: "" };

interface CreateCollectionDialogProps {
  /** Opened from elsewhere: no button, and the focus goes back through this. */
  controlled?: CollectionDialogState;
}

export function CreateCollectionDialog({
  controlled,
}: CreateCollectionDialogProps) {
  const t = useTranslations("collections");
  const [isOpenState, setIsOpenState] = useState(false);
  const isOpen = controlled?.open ?? isOpenState;
  const setIsOpen = controlled?.onOpenChange ?? setIsOpenState;
  const { isPending: isCreating, run, takeDone } = useSubmitDialog();

  // Esc, the overlay and the X wait for the result: closing now would lose
  // the input on a failure and let the form be sent twice.
  function handleOpenChange(open: boolean) {
    if (!isCreating) setIsOpen(open);
  }

  // Sonner is outside the transition, so a toast in the form would show
  // before the refreshed page closes the dialog. Radix calls this once the
  // dialog has closed, with or without an animation; focus still returns to
  // the trigger, or through `controlled`, which has none.
  function handleCloseAutoFocus(event: Event) {
    if (controlled) {
      event.preventDefault();
      controlled.returnFocus();
    }
    if (takeDone()) toast.success(t("toasts.created"));
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus />
            {t("create.title")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="max-h-[90vh] grid-cols-1 overflow-y-auto"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
          <DialogDescription>{t("create.description")}</DialogDescription>
        </DialogHeader>
        {/* Unmounted with the closed dialog, so every open starts empty. */}
        <CreateCollectionForm
          isCreating={isCreating}
          onSubmit={(values) =>
            run(() => createCollection(values), {
              onSuccess: () => setIsOpen(false),
              failCode: "collectionCreateFailed",
            })
          }
        />
      </DialogContent>
    </Dialog>
  );
}

interface CreateCollectionFormProps {
  isCreating: boolean;
  onSubmit: (values: CollectionFormValues) => void;
}

function CreateCollectionForm({
  isCreating,
  onSubmit,
}: CreateCollectionFormProps) {
  const t = useTranslations("common.actions");
  const [values, setValues] = useState(EMPTY_VALUES);

  function setField(name: keyof CollectionFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <CollectionFields values={values} onChange={setField} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={isCreating}>
            {t("cancel")}
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={isCreating || values.name.trim() === ""}
        >
          {isCreating ? t("creating") : t("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
