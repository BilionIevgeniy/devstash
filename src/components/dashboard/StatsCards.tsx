import { FolderHeart, FolderOpen, Package, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getDashboardStats } from "@/lib/dashboard-data";
import { getCollectionStats } from "@/lib/db/collections";

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

export async function StatsCards() {
  const stats = getDashboardStats();
  const collectionStats = await getCollectionStats();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Items" value={stats.items} icon={Package} />
      <StatCard
        label="Collections"
        value={collectionStats.total}
        icon={FolderOpen}
      />
      <StatCard label="Favorite Items" value={stats.favoriteItems} icon={Star} />
      <StatCard
        label="Favorite Collections"
        value={collectionStats.favorites}
        icon={FolderHeart}
      />
    </div>
  );
}
