import { useEffect, useRef } from "react";

// A page change keeps the link that was used in the DOM, and so its focus,
// except at an end: "Next page" on the last page is no link. The focus then
// goes to the current page's number, which is always there, instead of to
// the body, where the next Tab would start from the top of the document.
export function usePaginationFocus(page: number) {
  const navRef = useRef<HTMLElement>(null);
  const usedRef = useRef(false);

  useEffect(() => {
    if (!usedRef.current) return;
    usedRef.current = false;
    const nav = navRef.current;
    if (!nav || nav.contains(document.activeElement)) return;
    nav.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
  }, [page]);

  return {
    navRef,
    /** On the nav: a click or Enter on one of its links. */
    onActivate: () => {
      usedRef.current = true;
    },
  };
}
