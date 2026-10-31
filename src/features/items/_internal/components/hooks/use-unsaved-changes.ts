import { useEffect } from "react";

// Tells the owner whether a form holds unsaved edits, and warns before a
// reload or a closed tab drops them.
export function useUnsavedChanges(
  isChanged: boolean,
  onDirtyChange?: (isDirty: boolean) => void,
) {
  // Reported from an effect: the owner keeps it in a ref, and setting a
  // parent's state during this render is not allowed. The cleanup clears it
  // after a save or Cancel unmounts the form.
  useEffect(() => {
    onDirtyChange?.(isChanged);
    return () => onDirtyChange?.(false);
  }, [isChanged, onDirtyChange]);

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
