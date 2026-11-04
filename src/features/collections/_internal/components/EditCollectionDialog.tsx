import {
  useRef,
  useState,
  useTransition,
  type SubmitEvent,
  type TransitionStartFunction,
} from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

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
import type { CollectionDialogState } from "@/features/collections/_internal/components/hooks/use-collection-dialogs";
import { updateCollection } from "@/features/collections/actions/collection";
import {
  hasCollectionChanges,
  type CollectionFormValues,
} from "@/features/collections/domain/collection-fields";
import type { CollectionSummary } from "@/features/collections/types";

const SAVED_MESSAGE = "Collection updated";
const SAVE_FAILED_MESSAGE = "Couldn't update the collection";

interface EditCollectionDialogProps extends CollectionDialogState {
  collection: CollectionSummary;
}

export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
  returnFocus,
}: EditCollectionDialogProps) {
  const [isSaving, startSaving] = useTransition();
  const savedRef = useRef(false);

  // Esc, the overlay and the X wait for the result: closing now would lose
  // the input on a failure and let the form be sent twice.
  function handleOpenChange(next: boolean) {
    if (!isSaving) onOpenChange(next);
  }

  function handleSaved() {
    savedRef.current = true;
    onOpenChange(false);
  }

  // The toast waits for the dialog to close, as in CreateCollectionDialog.
  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    returnFocus();
    if (!savedRef.current) return;
    savedRef.current = false;
    toast.success(SAVED_MESSAGE);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] grid-cols-1 overflow-y-auto"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>
            Change the name and the description.
          </DialogDescription>
        </DialogHeader>
        {/* Unmounted with the closed dialog, so every open starts saved. */}
        <EditCollectionForm
          collection={collection}
          isSaving={isSaving}
          startSaving={startSaving}
          onSaved={handleSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditCollectionFormProps {
  collection: CollectionSummary;
  isSaving: boolean;
  startSaving: TransitionStartFunction;
  onSaved: () => void;
}

function EditCollectionForm({
  collection,
  isSaving,
  startSaving,
  onSaved,
}: EditCollectionFormProps) {
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
    startSaving(async () => {
      try {
        const result = await updateCollection(collection.id, values);
        if (result.success) {
          // After the await this is no longer part of the transition, so it
          // is wrapped again: the dialog closes in the commit that brings the
          // refreshed page, not before it.
          startSaving(onSaved);
        } else {
          toast.error(result.error ?? SAVE_FAILED_MESSAGE);
        }
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on.
        unstable_rethrow(error);
        toast.error(SAVE_FAILED_MESSAGE);
      }
    });
  }

  const canSave =
    values.name.trim() !== "" && hasCollectionChanges(initialValues, values);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <CollectionFields values={values} onChange={setField} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={isSaving}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSaving || !canSave}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
