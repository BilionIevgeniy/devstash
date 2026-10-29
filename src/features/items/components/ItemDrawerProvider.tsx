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
  const requestRef = useRef<AbortController | null>(null);

  const open = useCallback(async (next: DashboardItem) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setItem(next);
    setState({ status: "loading" });
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

  const value = useMemo(() => ({ open }), [open]);

  return (
    <ItemDrawerContext.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          aria-describedby={undefined}
          className="gap-0 data-[side=right]:sm:max-w-xl"
        >
          {item && <ItemDrawerContent item={item} state={state} />}
        </SheetContent>
      </Sheet>
    </ItemDrawerContext.Provider>
  );
}
