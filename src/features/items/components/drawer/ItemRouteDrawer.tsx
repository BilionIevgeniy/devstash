"use client";
import { useTranslations } from "next-intl";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { useRemountOnReveal } from "@/components/common/hooks/use-remount-on-reveal";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { systemTypeNameForSlug } from "@/features/item-types/domain/item-type";
import { DiscardChangesDialog } from "@/features/items/_internal/components/form/DiscardChangesDialog";
import { ItemDetailView } from "@/features/items/_internal/components/drawer/ItemDetailView";
import { ITEM_SHEET_CLASS } from "@/features/items/_internal/components/drawer/ItemDrawerContent";
import { ItemDrawerSkeleton } from "@/features/items/_internal/components/drawer/ItemDrawerSkeleton";
import { useDirtyCloseGuard } from "@/features/items/_internal/components/hooks/use-dirty-close-guard";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
import type {
  DashboardItem,
  ItemDetailJson,
  ItemEditMode,
} from "@/features/items/types";

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
// would leave the list; only the focus goes back. Unsaved edits are lost on that Back, since the route
// is already gone when the sheet hears of it.
//
// Mounted anew whenever its route shows again after Back and Forward
// (useRemountOnReveal, ADR 0037): kept hidden, the page inside the sheet's
// portal stayed hidden on return, an empty sheet over a page it had hidden.
export function ItemRouteDrawer({ children }: { children: ReactNode }) {
  return (
    <RouteDrawerSheet key={useRemountOnReveal()}>{children}</RouteDrawerSheet>
  );
}

function RouteDrawerSheet({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const pendingDeleteRef = useRef<string | null>(null);
  const { guardOpenChange, setDirty, discardDialogProps } =
    useDirtyCloseGuard(setIsOpen);
  const { remove, restoreFocus } = useItemDrawer();
  const router = useRouter();

  // The list stays mounted behind the route, so the card that opened the
  // drawer is still there to take the focus back. A deleted card leaves only
  // in the next commit, so it is passed over for the row next to it.
  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (isOpen) {
      restoreFocus();
      return;
    }
    router.back();
    const deletedId = pendingDeleteRef.current;
    if (deletedId) remove(deletedId);
    restoreFocus({ skipOpener: deletedId !== null });
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
          className={ITEM_SHEET_CLASS}
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
  canUseAi: boolean;
  editMode: ItemEditMode;
}

export function ItemRouteDrawerView({
  item,
  detail,
  canUseAi,
  editMode,
}: ItemRouteDrawerViewProps) {
  const context = useContext(RouteDrawerContext);
  if (!context) {
    throw new Error("ItemRouteDrawerView must be used inside ItemRouteDrawer");
  }

  return (
    <ItemDetailView
      item={item}
      detail={detail}
      canUseAi={canUseAi}
      editMode={editMode}
      variant="sheet"
      onDelete={context.closeAndDelete}
      onDirtyChange={context.setDirty}
    />
  );
}

export function ItemRouteDrawerMissing() {
  const t = useTranslations("items.drawer");
  return (
    <div className="px-6 pt-12 pb-6">
      <SheetTitle className="text-lg">{t("missing")}</SheetTitle>
    </div>
  );
}

// Radix wants a title in every dialog, so the skeleton has a hidden one. The
// type is read from the path, for a file or image skeleton of the right size:
// the params hold the type of the page behind the drawer, which a sidebar row
// of another type does not share.
export function ItemRouteDrawerSkeleton() {
  const t = useTranslations("items.drawer");
  const slug = usePathname().split("/")[2];

  return (
    <div className="px-6 pt-12 pb-6">
      <SheetTitle className="sr-only">{t("loading")}</SheetTitle>
      <ItemDrawerSkeleton typeName={systemTypeNameForSlug(slug) ?? undefined} />
    </div>
  );
}
