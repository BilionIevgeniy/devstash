import { FolderHeart, FolderOpen, Package, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getCollectionStats } from "@/features/collections/queries";
import { getItemStats } from "@/features/items/queries";
import { getSessionUser } from "@/features/auth/session";

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
  const { id: userId } = await getSessionUser();
  const [itemStats, collectionStats] = await Promise.all([
    getItemStats(userId),
    getCollectionStats(userId),
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Items" value={itemStats.total} icon={Package} />
      <StatCard
        label="Collections"
        value={collectionStats.total}
        icon={FolderOpen}
      />
      <StatCard
        label="Favorite Items"
        value={itemStats.favorites}
        icon={Star}
      />
      <StatCard
        label="Favorite Collections"
        value={collectionStats.favorites}
        icon={FolderHeart}
      />
    </div>
  );
}
