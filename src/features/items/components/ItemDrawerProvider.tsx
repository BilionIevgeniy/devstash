"use client";

import { startTransition, useOptimistic, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DELETED_MESSAGE,
  DELETE_FAILED_MESSAGE,
} from "@/features/items/_internal/components/DeleteItemDialog";
import { DiscardChangesDialog } from "@/features/items/_internal/components/DiscardChangesDialog";
import {
  ITEM_SHEET_CLASS,
  ItemDrawerContent,
} from "@/features/items/_internal/components/ItemDrawerContent";
import { useDirtyCloseGuard } from "@/features/items/_internal/components/hooks/use-dirty-close-guard";
import { useItemFavorites } from "@/features/items/_internal/components/hooks/use-item-favorites";
import { useItemPins } from "@/features/items/_internal/components/hooks/use-item-pins";
import { useItemSheet } from "@/features/items/_internal/components/hooks/use-item-sheet";
import { deleteItem } from "@/features/items/actions/item";
import { ItemDrawerContext } from "@/features/items/components/hooks/use-item-drawer";
import { requiresPro } from "@/features/items/domain/item-fields";
import type { DashboardItem } from "@/features/items/types";
import { isNavigationError } from "@/lib/navigation-error";

const NO_HIDDEN_IDS: ReadonlySet<string> = new Set();
// The sentinel sits above the list: the page stays where the user was.
const NO_SCROLL = { preventScroll: true };

async function deleteWithToast(id: string) {
  try {
    const result = await deleteItem(id);
    if (result.success) toast.success(DELETED_MESSAGE);
    else toast.error(result.error);
  } catch (error) {
    if (isNavigationError(error)) return;
    toast.error(DELETE_FAILED_MESSAGE);
  }
}

interface ItemDrawerProviderProps {
  /**
   * When set, opening an item navigates to `${basePath}/${id}` and the route
   * draws the drawer; this provider then renders no sheet of its own.
   */
  basePath?: string;
  /**
   * Replaces the default focus return to the opener, for a provider with no
   * card to give the focus back to (the palette).
   */
  onSheetCloseAutoFocus?: (event: Event) => void;
  /**
   * The user is on the Free plan, so items of a Pro type open nothing. A page
   * that lists them passes this; a type page refuses a Free user on its own.
   */
  lockProItems?: boolean;
  children: ReactNode;
}

export function ItemDrawerProvider({
  basePath,
  onSheetCloseAutoFocus,
  lockProItems = false,
  children,
}: ItemDrawerProviderProps) {
  const router = useRouter();
  const focusSentinelRef = useRef<HTMLDivElement>(null);
  const sheet = useItemSheet(focusSentinelRef);
  const guard = useDirtyCloseGuard(sheet.onOpenChange);
  const favorites = useItemFavorites(sheet.handleFavoriteSaved);
  const pins = useItemPins(sheet.handlePinSaved);
  const [hiddenIds, hideItem] = useOptimistic(
    NO_HIDDEN_IDS,
    (ids, id: string): ReadonlySet<string> => new Set(ids).add(id),
  );

  function open(next: DashboardItem) {
    if (basePath === undefined) {
      void sheet.openSheet(next);
      return;
    }
    router.push(`${basePath}/${encodeURIComponent(next.id)}`, {
      scroll: false,
    });
  }

  // The card is hidden while the transition runs. On success the action's
  // refresh brings the page without the item before the transition ends; on
  // failure the optimistic set reverts and the card comes back.
  function remove(id: string) {
    startTransition(async () => {
      hideItem(id);
      await deleteWithToast(id);
    });
  }

  function handleDelete(id: string) {
    sheet.onOpenChange(false);
    remove(id);
  }

  const value = {
    isLocked: (item: Pick<DashboardItem, "type">) =>
      lockProItems && requiresPro(item.type.name),
    focusListTop: () => focusSentinelRef.current?.focus(NO_SCROLL),
    open,
    remove,
    hiddenIds,
    ...favorites,
    ...pins,
  };

  if (basePath !== undefined) {
    return (
      <ItemDrawerContext.Provider value={value}>
        {children}
      </ItemDrawerContext.Provider>
    );
  }

  return (
    <ItemDrawerContext.Provider value={value}>
      <div ref={focusSentinelRef} tabIndex={-1} className="sr-only" />
      {children}
      <Sheet open={sheet.isOpen} onOpenChange={guard.guardOpenChange}>
        <SheetContent
          aria-describedby={undefined}
          className={ITEM_SHEET_CLASS}
          onCloseAutoFocus={onSheetCloseAutoFocus ?? sheet.handleCloseAutoFocus}
        >
          {sheet.item && (
            <ItemDrawerContent
              item={sheet.item}
              state={sheet.state}
              isEditing={sheet.isEditing}
              onEdit={() => sheet.setIsEditing(true)}
              onCancelEdit={() => sheet.setIsEditing(false)}
              onSaved={sheet.handleSaved}
              onDelete={handleDelete}
              onDirtyChange={guard.setDirty}
            />
          )}
        </SheetContent>
      </Sheet>
      <DiscardChangesDialog {...guard.discardDialogProps} />
    </ItemDrawerContext.Provider>
  );
}
