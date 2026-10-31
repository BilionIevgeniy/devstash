"use client";

import type { KeyboardEvent, ReactNode } from "react";

import { useItemDrawer } from "@/features/items/components/ItemDrawerProvider";
import type { DashboardItem } from "@/features/items/types";
import { cn } from "@/lib/utils";

interface ItemDrawerTriggerProps {
  item: DashboardItem;
  children: ReactNode;
  /** Layout for a trigger that fills part of a row, merged over the defaults. */
  className?: string;
}

// A div with role="button" rather than a <button>: the cards are <article>
// elements, which a button may not contain.
export function ItemDrawerTrigger({
  item,
  children,
  className,
}: ItemDrawerTriggerProps) {
  const { open, hiddenIds } = useItemDrawer();

  if (hiddenIds.has(item.id)) return null;

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
      className={cn(
        "cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </div>
  );
}
