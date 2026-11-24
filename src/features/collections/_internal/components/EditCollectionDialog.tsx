import { useState, type SubmitEvent } from "react";
import { useTranslations } from "next-intl";
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
} from "@/components/ui/dialog";
import { CollectionFields } from "@/features/collections/_internal/components/CollectionFields";
import { updateCollection } from "@/features/collections/actions/collection";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import {
  hasCollectionChanges,
  type CollectionFormValues,
} from "@/features/collections/domain/collection-fields";
import type { CollectionSummary } from "@/features/collections/types";

interface EditCollectionDialogProps extends DialogControl {
  collection: CollectionSummary;
}

export function EditCollectionDialog({
  collection,
  ...control
}: EditCollectionDialogProps) {
  const t = useTranslations("collections");
  const {
    isOpen,
    isPending: isSaving,
    run,
    close,
    handleOpenChange,
    handleCloseAutoFocus,
  } = useDialogControl(() => toast.success(t("toasts.updated")), control);
  const syncItems = useSyncItemQueries();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] grid-cols-1 overflow-y-auto"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>
        {/* Unmounted with the closed dialog, so every open starts saved. */}
        <EditCollectionForm
          collection={collection}
          isSaving={isSaving}
          onSubmit={(values) =>
            run(() => updateCollection(collection.id, values), {
              onSuccess: close,
              failCode: "collectionSaveFailed",
              sync: () => syncItems({ kind: "collections" }),
            })
          }
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditCollectionFormProps {
  collection: CollectionSummary;
  isSaving: boolean;
  onSubmit: (values: CollectionFormValues) => void;
}

function EditCollectionForm({
  collection,
  isSaving,
  onSubmit,
}: EditCollectionFormProps) {
  const t = useTranslations("common.actions");
  const [initialValues] = useState<CollectionFormValues>({
    name: collection.name,
    description: collection.description ?? "",
  });
  const [values, setValues] = useState(initialValues);

  function setField(name: keyof CollectionFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  const canSave =
    values.name.trim() !== "" && hasCollectionChanges(initialValues, values);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <CollectionFields values={values} onChange={setField} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={isSaving}>
            {t("cancel")}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSaving || !canSave}>
          {isSaving ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
