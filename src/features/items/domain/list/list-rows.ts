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

// How many of a list's rows are leaving at once, for a count that covers rows
// not loaded yet: every removal asked for (a row it took off the cached page
// is still in the count the server gave until the refresh brings a new one),
// and the deletes of loaded rows. A delete of a row already taken off is not
// counted twice.
export function pendingRemovals(
  loaded: readonly { id: string }[],
  hiddenIds: ReadonlySet<string>,
  overrides: ReadonlyMap<string, boolean>,
): number {
  const removed = new Set(
    [...overrides].filter(([, value]) => !value).map(([id]) => id),
  );
  for (const { id } of loaded) {
    if (hiddenIds.has(id)) removed.add(id);
  }
  return removed.size;
}
