import { useEffect } from "react";

import { isPaletteHotkey } from "@/features/search/domain/palette-hotkey";

const MODAL_SELECTOR = '[role="dialog"], [role="alertdialog"]';

// Cmd/Ctrl+K toggles the palette. The listener runs in the capture phase
// because Monaco stops the key for its own Cmd+K chords. Over another modal the
// key is left alone: the palette stays out of a drawer or dialog in use, and an
// editor inside it keeps its chords.
export function usePaletteHotkey(isOpen: boolean, onToggle: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isPaletteHotkey(event)) return;
      if (!isOpen && document.querySelector(MODAL_SELECTOR)) return;

      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) onToggle();
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, onToggle]);
}
