"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ItemDrawerContent,
  type ItemDetailState,
} from "@/features/items/_internal/components/ItemDrawerContent";
import type { ActionResult } from "@/lib/action-result";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

interface ItemDrawerContextValue {
  open: (item: DashboardItem) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

export function useItemDrawer(): ItemDrawerContextValue {
  const context = useContext(ItemDrawerContext);
  if (!context) {
    throw new Error("useItemDrawer must be used inside ItemDrawerProvider");
  }
  return context;
}

async function fetchItemDetail(
  id: string,
  signal: AbortSignal,
): Promise<ItemDetailJson | null> {
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`, {
    signal,
  });
  if (!response.ok) return null;
  const body = (await response.json()) as ActionResult<ItemDetailJson | null>;
  return body.data;
}

export function ItemDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<DashboardItem | null>(null);
  const [state, setState] = useState<ItemDetailState>({ status: "loading" });
  const [isEditing, setIsEditing] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const openItemIdRef = useRef<string | null>(null);
  const router = useRouter();

  const open = useCallback(async (next: DashboardItem) => {
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
  }, []);

  // The item stays in state after closing so the content does not vanish
  // while the sheet slides out.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) requestRef.current?.abort();
    setIsOpen(nextOpen);
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

  const value = useMemo(() => ({ open }), [open]);

  return (
    <ItemDrawerContext.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
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
            />
          )}
        </SheetContent>
      </Sheet>
    </ItemDrawerContext.Provider>
  );
}
