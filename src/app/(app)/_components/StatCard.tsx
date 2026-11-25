import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

// One total with its label and icon: the dashboard's stats and the profile's
// usage show the same card. The label stays on one line, so every card is as
// tall as its skeleton (90px): the icon stands beside the number, and the
// label has the whole width of the card.
export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p
        className="truncate text-sm text-muted-foreground max-sm:text-xs/5"
        title={label}
      >
        {label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-2xl font-semibold">{value}</p>
        <Icon className="size-5 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}
