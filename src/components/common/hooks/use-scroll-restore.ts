import { useLayoutEffect, type RefObject } from "react";

// In memory, not in sessionStorage: a Back inside the app is a soft
// navigation in the same document, so a module value outlives the unmounted
// list, and nothing is stored on the device (docs/privacy/processing-record.md,
// "Cookies and device storage"). A reload starts at the top, as before.
const savedPlaces = new Map<string, number>();

// The app shell scrolls its <main>, not the window, so neither the browser
// nor Next restores the place on Back. A long list (/favorites, /pinned)
// keeps the scroll position of that <main> for its history entry and sets it
// again when it mounts with the same key: the path plus the router's
// bfcacheId, which a push or replace changes and Back keeps (ADR 0025). The
// rows come from the cache in the same commit, so the height is there when
// the position is set.
export function useScrollRestore(
  ref: RefObject<HTMLElement | null>,
  key: string,
): void {
  useLayoutEffect(() => {
    const scroller = ref.current?.closest("main");
    if (!scroller) return;

    const saved = savedPlaces.get(key);
    if (saved !== undefined) scroller.scrollTop = saved;

    function save() {
      if (scroller) savedPlaces.set(key, scroller.scrollTop);
    }
    scroller.addEventListener("scroll", save, { passive: true });
    return () => scroller.removeEventListener("scroll", save);
  }, [ref, key]);
}
