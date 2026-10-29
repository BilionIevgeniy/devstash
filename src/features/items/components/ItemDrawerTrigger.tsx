"use client";

import type { KeyboardEvent, ReactNode } from "react";

import { useItemDrawer } from "@/features/items/components/ItemDrawerProvider";
import type { DashboardItem } from "@/features/items/types";

interface ItemDrawerTriggerProps {
  item: DashboardItem;
  children: ReactNode;
}

// A div with role="button" rather than a <button>: the cards are <article>
// elements, which a button may not contain.
export function ItemDrawerTrigger({ item, children }: ItemDrawerTriggerProps) {
  const { open } = useItemDrawer();

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(item);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => open(item)}
      onKeyDown={handleKeyDown}
      className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </div>
  );
}
