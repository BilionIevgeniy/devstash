"use client";

import {
  createContext,
  startTransition,
  useContext,
  useOptimistic,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DELETED_MESSAGE,
  DELETE_FAILED_MESSAGE,
} from "@/features/items/_internal/components/DeleteItemDialog";
import { DiscardChangesDialog } from "@/features/items/_internal/components/DiscardChangesDialog";
import { ItemDrawerContent } from "@/features/items/_internal/components/ItemDrawerContent";
import { useDirtyCloseGuard } from "@/features/items/_internal/components/hooks/use-dirty-close-guard";
import { useItemSheet } from "@/features/items/_internal/components/hooks/use-item-sheet";
import { deleteItem } from "@/features/items/actions/item";
import type { DashboardItem } from "@/features/items/types";

const NO_HIDDEN_IDS: ReadonlySet<string> = new Set();

interface ItemDrawerContextValue {
  open: (item: DashboardItem) => void;
  /** Deletes the item and hides its card until the fresh page arrives. */
  remove: (id: string) => void;
  /** Items being deleted: their cards are hidden until the fresh page arrives. */
  hiddenIds: ReadonlySet<string>;
}

interface ItemDrawerProviderProps {
  /**
   * When set, opening an item navigates to `${basePath}/${id}` and the route
   * draws the drawer; this provider then renders no sheet of its own.
   */
  basePath?: string;
  children: ReactNode;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

export function useItemDrawer(): ItemDrawerContextValue {
  const context = useContext(ItemDrawerContext);
  if (!context) {
    throw new Error("useItemDrawer must be used inside ItemDrawerProvider");
  }
  return context;
}

export function ItemDrawerProvider({
  basePath,
  children,
}: ItemDrawerProviderProps) {
  const router = useRouter();
  const sheet = useItemSheet();
  const guard = useDirtyCloseGuard(sheet.onOpenChange);
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
      try {
        const result = await deleteItem(id);
        if (result.success) toast.success(DELETED_MESSAGE);
        else toast.error(result.error ?? DELETE_FAILED_MESSAGE);
      } catch {
        toast.error(DELETE_FAILED_MESSAGE);
      }
    });
  }

  function handleDelete(id: string) {
    sheet.onOpenChange(false);
    remove(id);
  }

  const value = { open, remove, hiddenIds };

  if (basePath !== undefined) {
    return (
      <ItemDrawerContext.Provider value={value}>
        {children}
      </ItemDrawerContext.Provider>
    );
  }

  return (
    <ItemDrawerContext.Provider value={value}>
      {children}
      <Sheet open={sheet.isOpen} onOpenChange={guard.guardOpenChange}>
        <SheetContent
          aria-describedby={undefined}
          className="gap-0 data-[side=right]:sm:max-w-xl"
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
