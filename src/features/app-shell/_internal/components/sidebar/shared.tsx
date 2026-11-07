import type { ReactNode } from "react";

import { SidebarNavLink } from "@/features/app-shell/_internal/components/sidebar/SidebarNavLink";

// A link marked `aria-current="page"` stands for the page on screen.
export const LINK_CLASS =
  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground";

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
        <SidebarNavLink
          href={viewAll.href}
          match="exact"
          className="flex h-7 items-center rounded-md pr-2 pl-9 text-xs text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground"
        >
          {viewAll.label}
        </SidebarNavLink>
      )}
    </div>
  );
}
