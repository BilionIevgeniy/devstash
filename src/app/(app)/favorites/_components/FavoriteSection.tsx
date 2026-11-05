import type { ReactNode } from "react";

// Shared with loading.tsx, so the title does not move when the content commits.
export const FAVORITE_SECTION_HEADER =
  "flex h-8 items-center justify-between gap-3";

interface FavoriteSectionProps {
  title: string;
  count: number;
  action: ReactNode;
  children: ReactNode;
}

// The rows sit in a plain div with no spacing or dividers: a row being deleted
// from the drawer hides itself, and nothing of it may stay behind.
export function FavoriteSection({
  title,
  count,
  action,
  children,
}: FavoriteSectionProps) {
  return (
    <section className="space-y-2">
      <div className={FAVORITE_SECTION_HEADER}>
        <h2 className="font-mono text-sm font-semibold">
          {title} <span className="text-muted-foreground">({count})</span>
        </h2>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}
