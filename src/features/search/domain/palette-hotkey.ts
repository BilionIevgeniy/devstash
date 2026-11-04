const LATIN_LETTER = /^[a-z]$/i;

export interface HotkeyEvent {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

// Cmd/Ctrl+K by the letter typed, so Dvorak and the like work. A non-Latin
// layout types another letter there, so it falls back to the physical key.
export function isPaletteHotkey(event: HotkeyEvent): boolean {
  if (!event.metaKey && !event.ctrlKey) return false;
  if (event.altKey || event.shiftKey) return false;

  if (LATIN_LETTER.test(event.key)) return event.key.toLowerCase() === "k";
  return event.code === "KeyK";
}
