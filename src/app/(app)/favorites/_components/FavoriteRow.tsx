import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn, formatShortDate } from "@/lib/utils";

// Shared with loading.tsx, so the skeleton rows are as tall as the real ones.
export const FAVORITE_ROW_HEIGHT = "h-9";
// For what wraps a row, the drawer trigger or a link, so both act the same. The
// ring is inset: the rows touch, and a neighbour would paint over an outer one.
export const FAVORITE_ROW_WRAPPER =
  "block rounded-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

interface FavoriteRowProps {
  icon: ReactNode;
  title: string;
  badge: string;
  date: Date;
}

export function FavoriteRow({ icon, title, badge, date }: FavoriteRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-2 font-mono text-sm transition-colors hover:bg-accent/50",
        FAVORITE_ROW_HEIGHT,
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <Badge variant="secondary" className="font-normal">
        {badge}
      </Badge>
      <time
        dateTime={date.toISOString()}
        className="w-14 shrink-0 text-right text-xs text-muted-foreground"
      >
        {formatShortDate(date)}
      </time>
    </div>
  );
}
