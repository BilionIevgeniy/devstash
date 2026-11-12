import { useEffect, useEffectEvent } from "react";

import { isPaletteHotkey } from "@/features/search/domain/palette-hotkey";

const MODAL_SELECTOR = '[role="dialog"], [role="alertdialog"]';

// Cmd/Ctrl+K toggles the palette. The listener runs in the capture phase
// because Monaco stops the key for its own Cmd+K chords. Over another modal the
// key is left alone: the palette stays out of a drawer or dialog in use, and an
// editor inside it keeps its chords.
export function usePaletteHotkey(isOpen: boolean, onToggle: () => void) {
  // Reads the latest isOpen and onToggle, so the listener below is added once.
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!isPaletteHotkey(event)) return;
    if (!isOpen && document.querySelector(MODAL_SELECTOR)) return;

    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) onToggle();
  });

  useEffect(() => {
    // An Effect Event changes identity on every render, so the listener that is
    // added (and removed) is this wrapper, not the Effect Event itself.
    function listener(event: KeyboardEvent) {
      handleKeyDown(event);
    }

    document.addEventListener("keydown", listener, { capture: true });
    return () =>
      document.removeEventListener("keydown", listener, { capture: true });
  }, []);
}
