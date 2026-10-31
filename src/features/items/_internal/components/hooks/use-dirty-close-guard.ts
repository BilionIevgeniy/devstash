import { useRef, useState } from "react";

// Keeps a sheet with unsaved edits open until the user discards them. The
// edit form reports through setDirty; the sheet's onOpenChange goes through
// guardOpenChange, and discardDialogProps go to a DiscardChangesDialog.
export function useDirtyCloseGuard(onOpenChange: (open: boolean) => void) {
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  // Whether the edit form holds unsaved edits; read only when the sheet closes.
  const isDirtyRef = useRef(false);

  // Esc, the overlay and the close button all land here: with unsaved edits
  // the sheet stays open until the user discards them.
  function guardOpenChange(nextOpen: boolean) {
    if (!nextOpen && isDirtyRef.current) {
      setIsConfirmingClose(true);
      return;
    }
    onOpenChange(nextOpen);
  }

  function setDirty(isDirty: boolean) {
    isDirtyRef.current = isDirty;
  }

  const discardDialogProps = {
    open: isConfirmingClose,
    onOpenChange: setIsConfirmingClose,
    onDiscard: () => {
      isDirtyRef.current = false;
      onOpenChange(false);
    },
  };

  return { guardOpenChange, setDirty, discardDialogProps };
}
