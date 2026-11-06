import type { ReactNode } from "react";
import Link from "next/link";

export const LINK_CLASS =
  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-accent hover:text-foreground";

// A row the plan does not open: the shape of a link, with no hover.
export const DISABLED_ROW_CLASS =
  "flex cursor-not-allowed items-center gap-3 rounded-md px-2 py-1.5 text-sm text-foreground/50";

export function ItemCount({ value }: { value: number }) {
  return (
    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
      {value}
    </span>
  );
}

export interface ViewAllTarget {
  href: string;
  label: string;
}

interface SidebarGroupProps {
  label: string;
  viewAll?: ViewAllTarget;
  children: ReactNode;
}

// `pl-9` lines the link up with the titles of the rows, so it reads as the end
// of the list and not as one more row.
export function SidebarGroup({ label, viewAll, children }: SidebarGroupProps) {
  return (
    <div>
      <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">
        {label}
      </h3>
      <ul>{children}</ul>
      {viewAll && (
        <Link
          href={viewAll.href}
          className="flex h-7 items-center rounded-md pr-2 pl-9 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {viewAll.label}
        </Link>
      )}
    </div>
  );
}
