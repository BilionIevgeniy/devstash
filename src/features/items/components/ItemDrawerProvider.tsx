"use client";

import {
  createContext,
  startTransition,
  useContext,
  useOptimistic,
  useRef,
  useState,
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
import {
  ItemDrawerContent,
  type ItemDetailState,
} from "@/features/items/_internal/components/ItemDrawerContent";
import { fetchItemDetail } from "@/features/items/_internal/components/fetch-item-detail";
import { deleteItem } from "@/features/items/actions/item";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

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
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<DashboardItem | null>(null);
  const [state, setState] = useState<ItemDetailState>({ status: "loading" });
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const openItemIdRef = useRef<string | null>(null);
  // Whether the edit form holds unsaved edits; read only when the sheet closes.
  const isDirtyRef = useRef(false);
  const router = useRouter();
  const [hiddenIds, hideItem] = useOptimistic(
    NO_HIDDEN_IDS,
    (ids, id: string): ReadonlySet<string> => new Set(ids).add(id),
  );

  async function openSheet(next: DashboardItem) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    openItemIdRef.current = next.id;
    setItem(next);
    setState({ status: "loading" });
    setIsEditing(false);
    setIsOpen(true);

    try {
      const detail = await fetchItemDetail(next.id, controller.signal);
      if (controller.signal.aborted) return;
      setState(detail ? { status: "ready", detail } : { status: "error" });
    } catch {
      if (!controller.signal.aborted) setState({ status: "error" });
    }
  }

  function open(next: DashboardItem) {
    if (basePath === undefined) {
      void openSheet(next);
      return;
    }
    router.push(`${basePath}/${encodeURIComponent(next.id)}`, {
      scroll: false,
    });
  }

  // The item stays in state after closing so the content does not vanish
  // while the sheet slides out.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) requestRef.current?.abort();
    setIsOpen(nextOpen);
  }

  // Esc, the overlay and the close button all land here: with unsaved edits
  // the sheet stays open until the user discards them.
  function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && isDirtyRef.current) {
      setIsConfirmingClose(true);
      return;
    }
    handleOpenChange(nextOpen);
  }

  function setDirty(isDirty: boolean) {
    isDirtyRef.current = isDirty;
  }

  // The header, description and tags come from the card's item, so it is
  // updated along with the detail; the refresh updates the cards behind. The
  // ref, not the item in this closure, tells whether another card was opened
  // while the save was running.
  function handleSaved(detail: ItemDetailJson) {
    router.refresh();
    if (openItemIdRef.current !== detail.id) return;

    setItem((current) =>
      current && {
        ...current,
        title: detail.title,
        description: detail.description,
        tags: detail.tags,
      },
    );
    setState({ status: "ready", detail });
    setIsEditing(false);
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
    handleOpenChange(false);
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
      <Sheet open={isOpen} onOpenChange={requestOpenChange}>
        <SheetContent
          aria-describedby={undefined}
          className="gap-0 data-[side=right]:sm:max-w-xl"
        >
          {item && (
            <ItemDrawerContent
              item={item}
              state={state}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onCancelEdit={() => setIsEditing(false)}
              onSaved={handleSaved}
              onDelete={handleDelete}
              onDirtyChange={setDirty}
            />
          )}
        </SheetContent>
      </Sheet>
      <DiscardChangesDialog
        open={isConfirmingClose}
        onOpenChange={setIsConfirmingClose}
        onDiscard={() => {
          isDirtyRef.current = false;
          handleOpenChange(false);
        }}
      />
    </ItemDrawerContext.Provider>
  );
}
