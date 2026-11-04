import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchItemDetail } from "@/features/items/_internal/components/fetch-item-detail";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

export type ItemDetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; detail: ItemDetailJson };

// The item sheet of the pages with no item URL (the dashboard, a collection,
// the favorites): the card's item at once, its detail fetched from the API, and
// the edit mode. Closing aborts a detail still on its way.
export function useItemSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<DashboardItem | null>(null);
  const [state, setState] = useState<ItemDetailState>({ status: "loading" });
  const [isEditing, setIsEditing] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const openItemIdRef = useRef<string | null>(null);
  const router = useRouter();

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

  // The item stays in state after closing so the content does not vanish
  // while the sheet slides out.
  function onOpenChange(nextOpen: boolean) {
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

    setItem(
      (current) =>
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
    handleSaved,
    handleFavoriteSaved,
    handlePinSaved,
  };
}
