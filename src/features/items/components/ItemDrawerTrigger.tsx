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
  /** A control over the top-right corner of the card, such as a copy button. */
  action?: ReactNode;
}

// A div with role="button" rather than a <button>: the cards are <article>
// elements, which a button may not contain. The action is a sibling of the
// trigger, not a child: a button inside a role="button" is not allowed, and a
// click on it must not open the drawer.
export function ItemDrawerTrigger({
  item,
  children,
  className,
  action,
}: ItemDrawerTriggerProps) {
  const { open, hiddenIds } = useItemDrawer();

  if (hiddenIds.has(item.id)) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(item);
    }
  }

  const trigger = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => open(item)}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
        action && "h-full",
        className,
      )}
    >
      {children}
    </div>
  );

  if (!action) return trigger;

  return (
    <div className="relative h-full">
      {trigger}
      <div className="absolute top-2 right-2">{action}</div>
    </div>
  );
}
