import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type RefObject } from "react";

import { itemDetailQuery } from "@/features/items/_internal/components/fetch-item-detail";
import type {
  DashboardItem,
  ItemDetailJson,
  OpenedItemJson,
} from "@/features/items/types";

export type ItemDetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; detail: ItemDetailJson; canUseAi: boolean };

interface DetailQuery {
  data: OpenedItemJson | undefined;
  isError: boolean;
  isFetching: boolean;
}

// A failed detail opened again shows the skeleton while it is asked for once
// more, as a first open does, not the old error.
function detailState({
  data,
  isError,
  isFetching,
}: DetailQuery): ItemDetailState {
  if (data) {
    return { status: "ready", detail: data.item, canUseAi: data.canUseAi };
  }
  return isError && !isFetching ? { status: "error" } : { status: "loading" };
}

// The item sheet of the pages with no item URL (the dashboard, a collection,
// the favorites, the pins): the card's item at once, its detail from the Query
// cache (ADR 0025), fetched from the API when it is not fresh, and the edit
// mode. A detail that arrives after the sheet closed stays in the cache under
// its own id, so it can never show in the sheet of another item.
//
// The sheet has no SheetTrigger, so Radix has nothing to give the focus back
// to: the hook remembers the opener. A delete or an unpin can take the opener
// off the page, and then the focus goes to the sentinel the provider renders.
export function useItemSheet(focusSentinelRef: RefObject<HTMLElement | null>) {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<DashboardItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const openItemIdRef = useRef<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const detail = useQuery({
    ...itemDetailQuery(item?.id ?? ""),
    enabled: isOpen && item !== null,
  });
  const state = detailState(detail);

  function openSheet(next: DashboardItem) {
    const active = document.activeElement;
    openerRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null;

    openItemIdRef.current = next.id;
    setItem(next);
    setIsEditing(false);
    setIsOpen(true);
  }

  // The item stays in state after closing so the content does not vanish
  // while the sheet slides out.
  function onOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen);
  }

  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    const opener = openerRef.current;
    if (opener?.isConnected) opener.focus();
    else focusSentinelRef.current?.focus({ preventScroll: true });
  }

  // The header, description and tags come from the card's item, so it is
  // updated along with the detail, which the save already wrote to the cache
  // (useItemSave), keeping the plan read on open. The ref, not the item in
  // this closure, tells whether another card was opened while the save ran.
  function handleSaved(saved: ItemDetailJson) {
    if (openItemIdRef.current !== saved.id) return;

    setItem(
      (current) =>
        current && {
          ...current,
          title: saved.title,
          description: saved.description,
          tags: saved.tags,
        },
    );
    setIsEditing(false);
  }

  // The sheet holds its own copy of the card's item, so a favorite or pin saved
  // for the open item is written to it, or the button would fall back when the
  // optimistic value ends.
  function handleFavoriteSaved(id: string, isFavorite: boolean) {
    if (openItemIdRef.current !== id) return;
    setItem((current) => current && { ...current, isFavorite });
  }

  function handlePinSaved(id: string, isPinned: boolean) {
    if (openItemIdRef.current !== id) return;
    setItem((current) => current && { ...current, isPinned });
  }

  return {
    isOpen,
    item,
    state,
    isEditing,
    setIsEditing,
    openSheet,
    onOpenChange,
    handleCloseAutoFocus,
    handleSaved,
    handleFavoriteSaved,
    handlePinSaved,
  };
}
