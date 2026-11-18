import { useState, type ReactNode, type SubmitEvent } from "react";
import { useTranslations } from "next-intl";
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
import { CustomTypeFields } from "@/features/item-types/_internal/components/CustomTypeFields";
import {
  createCustomType,
  updateCustomType,
} from "@/features/item-types/actions/custom-type";
import {
  TYPE_COLORS,
  TYPE_ICON_NAMES,
} from "@/features/item-types/domain/custom-type";
import type { CustomTypeInput } from "@/features/item-types/schemas";
import type { CustomTypeRow } from "@/features/item-types/types";

interface CustomTypeDialogProps {
  /** The type to edit; without one the dialog creates a type. */
  type?: CustomTypeRow;
  trigger: ReactNode;
  /** The client cache follows the success (ADR 0025), from the composer. */
  sync?: () => Promise<void>;
}

// A stored value outside the palette (none today) shows the first choice.
function initialValues(type?: CustomTypeRow): CustomTypeInput {
  const icon = TYPE_ICON_NAMES.find((name) => name === type?.icon);
  const color = TYPE_COLORS.find((value) => value === type?.color);
  return {
    name: type?.name ?? "",
    icon: icon ?? TYPE_ICON_NAMES[0],
    color: color ?? TYPE_COLORS[0],
  };
}

export function CustomTypeDialog({
  type,
  trigger,
  sync,
}: CustomTypeDialogProps) {
  const t = useTranslations("customTypes");
  const [open, setOpen] = useState(false);
  const { isPending, run, takeDone } = useSubmitDialog();

  // Esc, the overlay and the X wait for the result, so the input stays.
  function handleOpenChange(next: boolean) {
    if (!isPending) setOpen(next);
  }

  // Radix gives the focus back to the trigger; the toast follows the close.
  function handleCloseAutoFocus() {
    if (takeDone())
      toast.success(t(type ? "toasts.updated" : "toasts.created"));
  }

  function submit(values: CustomTypeInput) {
    run(
      () =>
        type ? updateCustomType(type.id, values) : createCustomType(values),
      {
        onSuccess: () => setOpen(false),
        failCode: "customTypeSaveFailed",
        sync,
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent onCloseAutoFocus={handleCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>
            {t(type ? "form.editTitle" : "form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t(type ? "form.editDescription" : "form.createDescription")}
          </DialogDescription>
        </DialogHeader>
        {/* Unmounted with the closed dialog, so every open starts afresh. */}
        <CustomTypeForm
          initial={initialValues(type)}
          isEdit={type !== undefined}
          isPending={isPending}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CustomTypeFormProps {
  initial: CustomTypeInput;
  isEdit: boolean;
  isPending: boolean;
  onSubmit: (values: CustomTypeInput) => void;
}

function CustomTypeForm({
  initial,
  isEdit,
  isPending,
  onSubmit,
}: CustomTypeFormProps) {
  const t = useTranslations("common.actions");
  const [initialValues] = useState(initial);
  const [values, setValues] = useState(initial);

  function setField<K extends keyof CustomTypeInput>(
    name: K,
    value: CustomTypeInput[K],
  ) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  const changed =
    values.name.trim() !== initialValues.name ||
    values.icon !== initialValues.icon ||
    values.color !== initialValues.color;
  const canSave = values.name.trim() !== "" && (!isEdit || changed);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <CustomTypeFields values={values} onChange={setField} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={isPending}>
            {t("cancel")}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isPending || !canSave}>
          {pendingLabel(t, isEdit, isPending)}
        </Button>
      </DialogFooter>
    </form>
  );
}

function pendingLabel(
  t: (key: "save" | "saving" | "create" | "creating") => string,
  isEdit: boolean,
  isPending: boolean,
): string {
  if (isEdit) return t(isPending ? "saving" : "save");
  return t(isPending ? "creating" : "create");
}
