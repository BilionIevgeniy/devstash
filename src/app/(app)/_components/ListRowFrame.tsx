import type { ReactNode } from "react";

import { LIST_ROW_HEIGHT } from "@/app/(app)/_components/ListRow";
import { cn } from "@/lib/utils";

// Two controls wide on every row, so the dates of a section with one control
// line up with those of a section with two. Shared with the loading.tsx files.
export const LIST_ROW_ACTIONS_WIDTH = "w-16 shrink-0";

// An unset control shows on hover or focus where the device can hover, and
// always on touch. Opacity, not `hidden`: Tab has to reach it.
const REVEAL_UNSET_CONTROLS =
  "[@media(hover:hover)]:[&_[aria-pressed=false]]:opacity-0 [@media(hover:hover)]:group-hover/row:[&_[aria-pressed=false]]:opacity-100 [@media(hover:hover)]:group-focus-within/row:[&_[aria-pressed=false]]:opacity-100";

interface ListRowFrameProps {
  /** The drawer trigger or link, wrapping a ListRow. */
  children: ReactNode;
  actions: ReactNode;
}

// The controls are siblings of the trigger: a control inside a role="button" or
// a link is not allowed, and a click on it must not open anything.
export function ListRowFrame({ children, actions }: ListRowFrameProps) {
  return (
    <div
      data-list-row
      className={cn(
        "group/row flex items-stretch transition-colors hover:bg-accent/50",
        LIST_ROW_HEIGHT,
      )}
    >
      {children}
      <div
        className={cn(
          "flex items-center justify-end",
          LIST_ROW_ACTIONS_WIDTH,
          REVEAL_UNSET_CONTROLS,
        )}
      >
        {actions}
      </div>
    </div>
  );
}
