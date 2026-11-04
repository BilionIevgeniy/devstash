import type { ReactNode } from "react";

interface FavoriteSectionProps {
  title: string;
  count: number;
  children: ReactNode;
}

// The rows sit in a plain div with no spacing or dividers: a row being deleted
// from the drawer hides itself, and nothing of it may stay behind.
export function FavoriteSection({
  title,
  count,
  children,
}: FavoriteSectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="font-mono text-sm font-semibold">
        {title} <span className="text-muted-foreground">({count})</span>
      </h2>
      <div>{children}</div>
    </section>
  );
}
