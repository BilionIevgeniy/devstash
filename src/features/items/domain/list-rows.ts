// Long enough to reach Undo, which the default of 4 seconds is not.
export const UNDO_TOAST_DURATION = 8000;

// The rows of a list that a star or a pin keeps there: a row leaves at once when
// it is being deleted or its removal was asked for, and comes back if that fails.
export function visibleListItems<T extends { id: string }>(
  items: readonly T[],
  hiddenIds: ReadonlySet<string>,
  overrides: ReadonlyMap<string, boolean>,
): T[] {
  return items.filter(
    ({ id }) => !hiddenIds.has(id) && overrides.get(id) !== false,
  );
}
