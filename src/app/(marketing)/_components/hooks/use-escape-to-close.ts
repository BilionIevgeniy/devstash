import { useEffect, type RefObject } from "react";

// Esc closes an open panel and gives the focus back to the button that opened
// it. Listens only while the panel is open.
export function useEscapeToClose(
  open: boolean,
  close: () => void,
  trigger: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      trigger.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close, trigger]);
}
