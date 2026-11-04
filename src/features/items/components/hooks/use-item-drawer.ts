import { createContext, useContext } from "react";

import type { DashboardItem } from "@/features/items/types";

interface ItemDrawerContextValue {
  open: (item: DashboardItem) => void;
  /** Deletes the item and hides its card until the fresh page arrives. */
  remove: (id: string) => void;
  /** Items being deleted: their cards are hidden until the fresh page arrives. */
  hiddenIds: ReadonlySet<string>;
  /** Favorites being saved, with the value asked for. */
  favoriteOverrides: ReadonlyMap<string, boolean>;
  toggleFavorite: (id: string, isFavorite: boolean) => void;
  /** Pins being saved, with the value asked for. */
  pinOverrides: ReadonlyMap<string, boolean>;
  togglePin: (id: string, isPinned: boolean) => void;
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
export function useItemFavorite(id: string, isFavorite: boolean) {
  const { favoriteOverrides, toggleFavorite } = useItemDrawer();
  const override = favoriteOverrides.get(id);
  const isPending = override !== undefined;
  const current = override ?? isFavorite;

  function toggle() {
    if (!isPending) toggleFavorite(id, !current);
  }

  return { isFavorite: current, isPending, toggle };
}

// The pin of one item in the open drawer. As with the star, a click during a
// running save is ignored.
export function useItemPin(id: string, isPinned: boolean) {
  const { pinOverrides, togglePin } = useItemDrawer();
  const override = pinOverrides.get(id);
  const isPending = override !== undefined;
  const current = override ?? isPinned;

  function toggle() {
    if (!isPending) togglePin(id, !current);
  }

  return { isPinned: current, isPending, toggle };
}
