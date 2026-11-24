"use client";
import { useTranslations } from "next-intl";

import { useState, type SubmitEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  useDialogControl,
  type DialogControl,
} from "@/components/common/hooks/use-dialog-control";
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
import { createCollection } from "@/features/collections/actions/collection";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import type { CollectionFormValues } from "@/features/collections/domain/collection-fields";

const EMPTY_VALUES: CollectionFormValues = { name: "", description: "" };

interface CreateCollectionDialogProps {
  /** Opened from elsewhere: no button, and the focus goes back through this. */
  controlled?: DialogControl;
}

export function CreateCollectionDialog({
  controlled,
}: CreateCollectionDialogProps) {
  const t = useTranslations("collections");
  const {
    isOpen,
    isPending: isCreating,
    run,
    close,
    handleOpenChange,
    handleCloseAutoFocus,
  } = useDialogControl(() => toast.success(t("toasts.created")), controlled);
  const syncItems = useSyncItemQueries();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            aria-label={t("create.title")}
            className="max-xl:size-8 max-xl:px-0"
          >
            <Plus />
            <span className="hidden xl:inline">{t("create.title")}</span>
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
              onSuccess: close,
              failCode: "collectionCreateFailed",
              sync: () => syncItems({ kind: "collections" }),
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
