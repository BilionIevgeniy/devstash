"use client";

import {
  useRef,
  useState,
  useTransition,
  type SubmitEvent,
  type TransitionStartFunction,
} from "react";
import { unstable_rethrow } from "next/navigation";
import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { CollectionFields } from "@/features/collections/_internal/components/CollectionFields";
import type { CollectionDialogState } from "@/features/collections/_internal/components/hooks/use-collection-dialogs";
import { createCollection } from "@/features/collections/actions/collection";
import type { CollectionFormValues } from "@/features/collections/domain/collection-fields";

const LABEL = "New collection";
const EMPTY_VALUES: CollectionFormValues = { name: "", description: "" };
const CREATED_MESSAGE = "Collection created";
const CREATE_FAILED_MESSAGE = "Couldn't create the collection";

interface CreateCollectionDialogProps {
  /** Opened from elsewhere: no button, and the focus goes back through this. */
  controlled?: CollectionDialogState;
}

export function CreateCollectionDialog({
  controlled,
}: CreateCollectionDialogProps) {
  const [isOpenState, setIsOpenState] = useState(false);
  const isOpen = controlled?.open ?? isOpenState;
  const setIsOpen = controlled?.onOpenChange ?? setIsOpenState;
  const [isCreating, startCreating] = useTransition();
  const createdRef = useRef(false);

  // Esc, the overlay and the X wait for the result: closing now would lose
  // the input on a failure and let the form be sent twice.
  function handleOpenChange(open: boolean) {
    if (!isCreating) setIsOpen(open);
  }

  function handleCreated() {
    createdRef.current = true;
    setIsOpen(false);
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
    if (!createdRef.current) return;
    createdRef.current = false;
    toast.success(CREATED_MESSAGE);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus />
            {LABEL}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="max-h-[90vh] grid-cols-1 overflow-y-auto"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{LABEL}</DialogTitle>
          <DialogDescription>
            Group related items in one place.
          </DialogDescription>
        </DialogHeader>
        {/* Unmounted with the closed dialog, so every open starts empty. */}
        <CreateCollectionForm
          isCreating={isCreating}
          startCreating={startCreating}
          onCreated={handleCreated}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CreateCollectionFormProps {
  isCreating: boolean;
  startCreating: TransitionStartFunction;
  onCreated: () => void;
}

function CreateCollectionForm({
  isCreating,
  startCreating,
  onCreated,
}: CreateCollectionFormProps) {
  const [values, setValues] = useState(EMPTY_VALUES);

  function setField(name: keyof CollectionFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    startCreating(async () => {
      try {
        const result = await createCollection(values);
        if (result.success) {
          // After the await this is no longer part of the transition, so it
          // is wrapped again: the dialog closes in the commit that brings the
          // refreshed page with the new collection, not before it.
          startCreating(onCreated);
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on. A
        // rejection left in the transition would reach the root error page:
        // the dialog sits in the layout, above `(app)/error.tsx`.
        unstable_rethrow(error);
        toast.error(CREATE_FAILED_MESSAGE);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <CollectionFields values={values} onChange={setField} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={isCreating}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={isCreating || values.name.trim() === ""}
        >
          {isCreating ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
