import { createContext, useContext } from "react";

import type { DashboardItem } from "@/features/items/types";

export interface ToggleOptions {
  /** A removal takes the row off its list, so the toast offers Undo. */
  undoable?: boolean;
}

interface ItemDrawerContextValue {
  /** The plan does not give this item's type, so it opens nothing. */
  isLocked: (item: Pick<DashboardItem, "type">) => boolean;
  /** Takes the focus when the row that held it is gone. */
  focusListTop: () => void;
  open: (item: DashboardItem) => void;
  /** Deletes the item and hides its card until the fresh page arrives. */
  remove: (id: string) => void;
  /** Items being deleted: their cards are hidden until the fresh page arrives. */
  hiddenIds: ReadonlySet<string>;
  /** Favorites being saved, with the value asked for. */
  favoriteOverrides: ReadonlyMap<string, boolean>;
  toggleFavorite: (
    id: string,
    isFavorite: boolean,
    options?: ToggleOptions,
  ) => void;
  /** Pins being saved, with the value asked for. */
  pinOverrides: ReadonlyMap<string, boolean>;
  togglePin: (id: string, isPinned: boolean, options?: ToggleOptions) => void;
}

// Apart from the provider, which imports the drawer content: the action bar
// inside that content reads this context too.
export const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(
  null,
);

export function useItemDrawer(): ItemDrawerContextValue {
  const context = useContext(ItemDrawerContext);
  if (!context) {
    throw new Error("useItemDrawer must be used inside ItemDrawerProvider");
  }
  return context;
}

// The star of one item, the same in its card and in the open drawer. A click
// during a running save is ignored, so it cannot be sent twice.
export function useItemFavorite(
  id: string,
  isFavorite: boolean,
  options?: ToggleOptions,
) {
  const { favoriteOverrides, toggleFavorite } = useItemDrawer();
  const override = favoriteOverrides.get(id);
  const isPending = override !== undefined;
  const current = override ?? isFavorite;

  function toggle() {
    if (!isPending) toggleFavorite(id, !current, options);
  }

  return { isFavorite: current, isPending, toggle };
}

// The pin of one item, the same in its row and in the open drawer. As with the
// star, a click during a running save is ignored.
export function useItemPin(
  id: string,
  isPinned: boolean,
  options?: ToggleOptions,
) {
  const { pinOverrides, togglePin } = useItemDrawer();
  const override = pinOverrides.get(id);
  const isPending = override !== undefined;
  const current = override ?? isPinned;

  function toggle() {
    if (!isPending) togglePin(id, !current, options);
  }

  return { isPinned: current, isPending, toggle };
}
