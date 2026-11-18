import "client-only";

// Every trigger that opens an item carries `data-item-trigger`
// (ItemDrawerTrigger), so the rows around an opener can be found in the
// page's order.
const TRIGGER_SELECTOR = "[data-item-trigger]";

/** Where the focus can go back to when a drawer or dialog closes. */
export interface FocusTargets {
  opener: HTMLElement | null;
  /** The next trigger, then the one before: the rows around the opener. */
  neighbours: HTMLElement[];
}

export const NO_FOCUS_TARGETS: FocusTargets = { opener: null, neighbours: [] };

function follows(reference: Node, other: Node): boolean {
  return Boolean(
    reference.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

// The neighbours are read when the drawer opens, while the opener's row is
// still on the page: a delete or an unpin takes it off before the focus comes
// back, and then there is nothing left to measure from. The page's order, not
// one list's: the dashboard's sections follow each other.
export function captureFocusTargets(opener: HTMLElement | null): FocusTargets {
  if (!opener) return NO_FOCUS_TARGETS;

  const triggers = Array.from(
    opener.ownerDocument.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR),
  ).filter((trigger) => trigger !== opener && !opener.contains(trigger));
  const next = triggers.find((trigger) => follows(opener, trigger));
  const previous = triggers.findLast((trigger) => follows(trigger, opener));

  return {
    opener,
    neighbours: [next, previous].filter(
      (trigger): trigger is HTMLElement => trigger !== undefined,
    ),
  };
}

interface RestoreOptions {
  /**
   * The opener is about to leave the page (a delete still waiting for its
   * commit), so it is passed over even while it is still connected.
   */
  skipOpener?: boolean;
}

// The first target still on the page takes the focus, else the fallback (the
// sentinel above the list).
export function restoreFocus(
  targets: FocusTargets,
  fallback: () => void,
  { skipOpener = false }: RestoreOptions = {},
): void {
  const candidates = skipOpener
    ? targets.neighbours
    : [targets.opener, ...targets.neighbours];
  const target = candidates.find((candidate) => candidate?.isConnected);

  if (target) target.focus();
  else fallback();
}
