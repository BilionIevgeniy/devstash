import { useLayoutEffect, useRef, type FocusEvent } from "react";

const ROW = "[data-list-row]";
const ROW_TARGET = '[role="button"], a';
const EMPTY_STATE = "[data-list-empty]";

function visibleRows(list: HTMLElement): Element[] {
  return [...list.querySelectorAll(ROW)].filter(
    (row) => row.closest("[hidden]") === null,
  );
}

// After the user asked for more rows with a button, the first new row takes
// the focus, so the keyboard goes on forward and the focus does not fall to
// the body when the button leaves after the last page. `index` counts the
// visible rows inside `container`.
export function focusListRow(container: HTMLElement, index: number) {
  const target = visibleRows(container)[index]?.querySelector(ROW_TARGET);
  if (target instanceof HTMLElement) target.focus();
}

// A row that removes itself takes the focused control with it, and the focus
// would fall to the body. It goes to the row now in that place, the last row, or
// the empty state. `rowCount` is the number of rows the list shows.
export function useRowFocus(rowCount: number) {
  const listRef = useRef<HTMLDivElement>(null);
  const focusedIndexRef = useRef<number | null>(null);

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    const row = event.target.closest(ROW);
    focusedIndexRef.current =
      row && listRef.current ? visibleRows(listRef.current).indexOf(row) : null;
  }

  useLayoutEffect(() => {
    const list = listRef.current;
    const index = focusedIndexRef.current;
    if (!list || index === null || document.activeElement !== document.body) {
      return;
    }

    const rows = visibleRows(list);
    const row = rows[Math.min(index, rows.length - 1)];
    const target =
      row?.querySelector(ROW_TARGET) ?? list.querySelector(EMPTY_STATE);
    // The index can be stale (Safari does not focus a clicked button), so the
    // focus must not scroll the page to a row far from where the user is.
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  }, [rowCount]);

  function focusRowAt(index: number) {
    if (listRef.current) focusListRow(listRef.current, index);
  }

  return { listRef, handleFocus, focusRowAt };
}
