import { useRef, useTransition } from "react";

// What an accept handler resolves to: the step that shows the saved item, or
// null after a failure it has reported.
export type AcceptPrompt = (prompt: string) => Promise<(() => void) | null>;

// The save of an accepted prompt and the way back to the original. The focus
// goes to the header button first, since the bar that had it unmounts.
export function usePromptAccept(onAccept: AcceptPrompt, reset: () => void) {
  const [isSaving, startSaving] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);

  function backToOriginal() {
    buttonRef.current?.focus();
    reset();
  }

  function accept(prompt: string) {
    startSaving(async () => {
      const showSaved = await onAccept(prompt);
      if (!showSaved) return;
      // Wrapped again after the await: the saved prompt and the reset land
      // in one commit, so the old prompt never flashes.
      startSaving(() => {
        showSaved();
        backToOriginal();
      });
    });
  }

  return { isSaving, buttonRef, accept, backToOriginal };
}
