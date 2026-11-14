import { FolderHeart, FolderOpen, Package, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { LucideIcon } from "lucide-react";

import { getCollectionStats } from "@/features/collections/queries";
import { getItemStats } from "@/features/items/queries";
import { getSessionUser } from "@/features/auth/nextauth/session";

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
  const t = await getTranslations("pages.dashboard");
  const { id: userId } = await getSessionUser();
  const [itemStats, collectionStats] = await Promise.all([
    getItemStats(userId),
    getCollectionStats(userId),
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label={t("items")} value={itemStats.total} icon={Package} />
      <StatCard
        label={t("collections")}
        value={collectionStats.total}
        icon={FolderOpen}
      />
      <StatCard
        label={t("favoriteItems")}
        value={itemStats.favorites}
        icon={Star}
      />
      <StatCard
        label={t("favoriteCollections")}
        value={collectionStats.favorites}
        icon={FolderHeart}
      />
    </div>
  );
}
