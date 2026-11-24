import { FolderHeart, FolderOpen, Package, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getCollectionStats } from "@/features/collections/queries/dashboard";
import { getItemStats } from "@/features/items/queries/dashboard";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { StatCard } from "@/app/(app)/_components/StatCard";

export async function StatsCards() {
  const t = await getTranslations("pages.dashboard");
  const { id: userId } = await getSessionUser();
  const [itemStats, collectionStats] = await Promise.all([
    getItemStats(userId),
    getCollectionStats(userId),
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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
