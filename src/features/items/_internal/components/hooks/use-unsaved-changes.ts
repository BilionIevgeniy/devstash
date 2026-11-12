import { useEffect, useEffectEvent } from "react";

// Tells the owner whether a form holds unsaved edits, and warns before a
// reload or a closed tab drops them. `onDirtyChange` must report to the same
// place for as long as the form lives: it is read when the state changes, so a
// new callback is not told the current state until the next change.
export function useUnsavedChanges(
  isChanged: boolean,
  onDirtyChange?: (isDirty: boolean) => void,
) {
  const reportDirty = useEffectEvent((isDirty: boolean) =>
    onDirtyChange?.(isDirty),
  );

  // Reported from an effect: the owner keeps it in a ref, and setting a
  // parent's state during this render is not allowed. The cleanup clears it
  // after a save or Cancel unmounts the form.
  useEffect(() => {
    reportDirty(isChanged);
    return () => reportDirty(false);
  }, [isChanged]);

  // A reload or a closed tab would drop the edits without a word.
  useEffect(() => {
    if (!isChanged) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isChanged]);
}
