import { BarChart3, FolderOpen, Package } from "lucide-react";
import { typeLabel } from "@/features/item-types/domain/item-type";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { StatCard } from "@/app/(app)/_components/StatCard";
import {
  USAGE_TOTALS,
  USAGE_TYPES,
} from "@/app/(app)/profile/_components/ProfileSkeletons";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { getCollectionStats } from "@/features/collections/queries/dashboard";
import { getItemStats } from "@/features/items/queries/dashboard";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { getSidebarItemTypes } from "@/features/item-types/queries";
import type { SidebarItemType } from "@/features/item-types/types";

function TypeCount({ type }: { type: SidebarItemType }) {
  const typeName = useTranslations("itemTypes");
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <TypeIcon
        name={type.icon}
        className="size-4 shrink-0"
        typeColor={type.color}
      />
      <span>{typeLabel(typeName, type.name, "other")}</span>
      <span className="ml-auto text-sm font-medium tabular-nums">
        {type.itemCount}
      </span>
    </li>
  );
}

export async function UsageStats() {
  const t = await getTranslations("pages.profile");
  const { id: userId } = await getSessionUser();
  const [itemStats, collectionStats, itemTypes] = await Promise.all([
    getItemStats(userId),
    getCollectionStats(userId),
    getSidebarItemTypes(userId),
  ]);

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <BarChart3 className="size-4 text-muted-foreground" />
        {t("usage")}
      </h2>
      <div className={USAGE_TOTALS}>
        <StatCard label={t("items")} value={itemStats.total} icon={Package} />
        <StatCard
          label={t("collections")}
          value={collectionStats.total}
          icon={FolderOpen}
        />
      </div>
      <ul className={USAGE_TYPES}>
        {itemTypes.map((type) => (
          <TypeCount key={type.id} type={type} />
        ))}
      </ul>
    </section>
  );
}
