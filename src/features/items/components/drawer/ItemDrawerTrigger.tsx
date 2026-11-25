"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import Link from "next/link";

import { LockedItemCard } from "@/features/items/_internal/components/locked/LockedItemCard";
import { LockedItemRow } from "@/features/items/_internal/components/locked/LockedItemRow";
import { useItemDrawer } from "@/features/items/components/hooks/use-item-drawer";
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

// On a type page every item has a URL, so the trigger is a link: Cmd/Ctrl+click
// and "Open in new tab" work, and the route is prefetched. The intercepted
// route draws the drawer for a plain click. Elsewhere the drawer has no URL,
// and the trigger is a div with role="button" rather than a <button>: the
// cards are <article> elements, which a button may not contain. The action is
// a sibling of the trigger, not a child: a control inside a link or a
// role="button" is not allowed, and a click on it must not open the drawer. A
// locked item opens nothing, and its action goes too: with one it is a card,
// without one a row. The wrapper of a card with an action is the hover group,
// so the card keeps its hover while the pointer is over the action.
export function ItemDrawerTrigger({
  item,
  children,
  className,
  action,
}: ItemDrawerTriggerProps) {
  const { open, hiddenIds, isLocked, hrefFor, rememberOpener } =
    useItemDrawer();

  if (hiddenIds.has(item.id)) return null;

  if (isLocked(item)) {
    if (action) return <LockedItemCard item={item}>{children}</LockedItemCard>;
    return <LockedItemRow className={className}>{children}</LockedItemRow>;
  }

  const triggerClass = cn(
    "block cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
    action && "h-full",
    className,
  );
  const href = hrefFor(item);
  const trigger = href ? (
    <Link
      href={href}
      scroll={false}
      onClick={(event) => rememberLinkOpener(event, rememberOpener)}
      className={triggerClass}
      data-item-trigger=""
    >
      {children}
    </Link>
  ) : (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => open(item, event.currentTarget)}
      onKeyDown={(event) =>
        openOnKey(event, () => open(item, event.currentTarget))
      }
      className={triggerClass}
      data-item-trigger=""
    >
      {children}
    </div>
  );

  if (!action) return trigger;

  return (
    <div className="group/card relative h-full">
      {trigger}
      <div className="absolute top-2 right-2">{action}</div>
    </div>
  );
}

// A modified or middle click opens a new tab or window, where no drawer opens
// here, so nothing is remembered.
function rememberLinkOpener(
  event: MouseEvent<HTMLAnchorElement>,
  remember: (opener: HTMLElement) => void,
) {
  const modified =
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  if (modified || event.button !== 0) return;
  remember(event.currentTarget);
}

function openOnKey(event: KeyboardEvent<HTMLDivElement>, open: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    open();
  }
}
