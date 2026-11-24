import { useState } from "react";

import { useSubmitDialog } from "@/components/common/hooks/use-submit-dialog";

/** A dialog opened from elsewhere: it has no trigger of its own. */
export interface DialogControl {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Radix has no trigger to give the focus back to, so this does it. */
  returnFocus: () => void;
}

// The open state of a dialog that waits for its request (useSubmitDialog): its
// own, or `controlled` by whoever opened it. Esc, the overlay and the X wait
// for the result (`handleOpenChange`): closing then would lose the input on a
// failure and let the form be sent twice. `close` is for the success alone; it
// runs while the request is still pending, so it is never held back.
//
// `onDone` runs once the dialog has closed after a success: Sonner is outside
// the transition, so a toast in the form would show before the refreshed page
// closes the dialog. Radix calls `handleCloseAutoFocus` then, with or without
// an animation; the focus returns to the trigger, or through `controlled`.
export function useDialogControl(
  onDone: () => void,
  controlled?: DialogControl,
) {
  const [isOwnOpen, setIsOwnOpen] = useState(false);
  const { isPending, run, takeDone } = useSubmitDialog();
  const setOpen = controlled?.onOpenChange ?? setIsOwnOpen;

  function handleOpenChange(open: boolean) {
    if (!isPending) setOpen(open);
  }

  function handleCloseAutoFocus(event: Event) {
    if (controlled) {
      event.preventDefault();
      controlled.returnFocus();
    }
    if (takeDone()) onDone();
  }

  return {
    isOpen: controlled?.open ?? isOwnOpen,
    isPending,
    run,
    close: () => setOpen(false),
    handleOpenChange,
    handleCloseAutoFocus,
  };
}
