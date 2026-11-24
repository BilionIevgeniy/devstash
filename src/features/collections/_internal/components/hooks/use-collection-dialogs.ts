import { useState } from "react";

import type { DialogControl } from "@/components/common/hooks/use-dialog-control";

type CollectionDialog = "edit" | "delete";

// The open dialog of a collection and the control that opened it, shared by
// the page header and the card menu.
export function useCollectionDialogs() {
  const [openDialogName, setOpenDialogName] = useState<CollectionDialog | null>(
    null,
  );
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);

  function openDialog(name: CollectionDialog, opener: HTMLElement | null) {
    setTrigger(opener);
    setOpenDialogName(name);
  }

  function dialogState(name: CollectionDialog): DialogControl {
    return {
      open: openDialogName === name,
      onOpenChange: (open) => setOpenDialogName(open ? name : null),
      returnFocus: () => trigger?.focus(),
    };
  }

  return {
    isAnyOpen: openDialogName !== null,
    openDialog,
    editDialog: dialogState("edit"),
    deleteDialog: dialogState("delete"),
  };
}
