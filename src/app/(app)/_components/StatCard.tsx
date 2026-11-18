import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

// One total with its label and icon: the dashboard's stats and the profile's
// usage show the same card. The label stays on one line, so every card is as
// tall as its skeleton (90px); a label cut short keeps its full text in
// `title`.
export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card p-4">
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground" title={label}>
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </div>
      <Icon className="size-5 shrink-0 text-muted-foreground" />
    </div>
  );
}
