"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { parseTypeSlug } from "@/features/item-types/domain/item-type";
import { DiscardChangesDialog } from "@/features/items/_internal/components/DiscardChangesDialog";
import { ItemDetailView } from "@/features/items/_internal/components/ItemDetailView";
import { ItemDrawerSkeleton } from "@/features/items/_internal/components/ItemDrawerSkeleton";
import { useDirtyCloseGuard } from "@/features/items/_internal/components/hooks/use-dirty-close-guard";
import { useItemDrawer } from "@/features/items/components/ItemDrawerProvider";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

interface RouteDrawerContextValue {
  closeAndDelete: (id: string) => void;
  setDirty: (isDirty: boolean) => void;
}

const RouteDrawerContext = createContext<RouteDrawerContextValue | null>(null);

// The sheet of the intercepted item route. It lives in the route's layout, so
// it stays mounted while the loading skeleton gives way to the page. Closing
// first lets the sheet slide out, then goes back to the list: Radix calls
// onCloseAutoFocus once the content has unmounted, with or without an
// animation. A delete waits for the same moment, so the action's refresh
// lands on the list, not on the item route of a deleted item.
//
// Radix also calls it when the route itself goes away (browser Back), with
// the sheet still open: the history has already moved, so going back again
// would leave the list. Unsaved edits are lost on that Back, since the route
// is already gone when the sheet hears of it.
export function ItemRouteDrawer({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const pendingDeleteRef = useRef<string | null>(null);
  const { guardOpenChange, setDirty, discardDialogProps } =
    useDirtyCloseGuard(setIsOpen);
  const { remove } = useItemDrawer();
  const router = useRouter();

  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (isOpen) return;
    router.back();
    if (pendingDeleteRef.current) remove(pendingDeleteRef.current);
  }

  function closeAndDelete(id: string) {
    pendingDeleteRef.current = id;
    setIsOpen(false);
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={guardOpenChange}>
        <SheetContent
          aria-describedby={undefined}
          className="gap-0 data-[side=right]:sm:max-w-xl"
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <RouteDrawerContext.Provider value={{ closeAndDelete, setDirty }}>
            {children}
          </RouteDrawerContext.Provider>
        </SheetContent>
      </Sheet>
      <DiscardChangesDialog {...discardDialogProps} />
    </>
  );
}

interface ItemRouteDrawerViewProps {
  item: DashboardItem;
  detail: ItemDetailJson;
}

export function ItemRouteDrawerView({
  item,
  detail,
}: ItemRouteDrawerViewProps) {
  const context = useContext(RouteDrawerContext);
  if (!context) {
    throw new Error("ItemRouteDrawerView must be used inside ItemRouteDrawer");
  }

  return (
    <ItemDetailView
      item={item}
      detail={detail}
      variant="sheet"
      onDelete={context.closeAndDelete}
      onDirtyChange={context.setDirty}
    />
  );
}

export function ItemRouteDrawerMissing() {
  return (
    <div className="px-6 pt-12 pb-6">
      <SheetTitle className="text-lg">This item no longer exists</SheetTitle>
    </div>
  );
}

// Radix wants a title in every dialog, so the skeleton has a hidden one. A
// loading file gets no params, so the type is read from the URL here, for a
// file or image skeleton of the right size.
export function ItemRouteDrawerSkeleton() {
  const { type } = useParams<{ type: string }>();

  return (
    <div className="px-6 pt-12 pb-6">
      <SheetTitle className="sr-only">Loading item</SheetTitle>
      <ItemDrawerSkeleton typeName={parseTypeSlug(type) ?? undefined} />
    </div>
  );
}
