import { FolderHeart, FolderOpen, Package, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getDashboardStats } from "@/lib/dashboard-data";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
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

export function StatsCards() {
  const stats = getDashboardStats();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Items" value={stats.items} icon={Package} />
      <StatCard
        label="Collections"
        value={stats.collections}
        icon={FolderOpen}
      />
      <StatCard label="Favorite Items" value={stats.favoriteItems} icon={Star} />
      <StatCard
        label="Favorite Collections"
        value={stats.favoriteCollections}
        icon={FolderHeart}
      />
    </div>
  );
}
