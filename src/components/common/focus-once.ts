import "client-only";

// Moves the focus to a part of the page, and with it the Tab order and a screen
// reader's place. A part that cannot take the focus takes it for this once:
// focusable for good, every click on its empty space would make it the active
// element, and what asks "has anything the focus?" would be wrong.
export function focusOnce(element: HTMLElement, options?: FocusOptions): void {
  if (!element.hasAttribute("tabindex")) {
    element.setAttribute("tabindex", "-1");
    element.addEventListener(
      "blur",
      () => element.removeAttribute("tabindex"),
      {
        once: true,
      },
    );
  }
  element.focus(options);
}
