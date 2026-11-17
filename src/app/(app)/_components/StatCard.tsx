import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

// One total with its label and icon: the dashboard's stats and the profile's
// usage show the same card.
export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </div>
      <Icon className="size-5 text-muted-foreground" />
    </div>
  );
}
