import { useEffect, useEffectEvent, type RefObject } from "react";

// Esc closes an open panel and gives the focus back to the button that opened
// it. Listens only while the panel is open; `close` is read when the key is
// pressed, so a new callback on each render does not restart the listener.
export function useEscapeToClose(
  open: boolean,
  close: () => void,
  trigger: RefObject<HTMLElement | null>,
) {
  const onEscape = useEffectEvent(() => {
    close();
    trigger.current?.focus();
  });

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
}
