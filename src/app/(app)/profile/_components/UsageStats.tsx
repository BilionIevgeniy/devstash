import { BarChart3, FolderOpen, Package } from "lucide-react";
import { typeLabel } from "@/features/item-types/domain/item-type";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { LucideIcon } from "lucide-react";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { getCollectionStats } from "@/features/collections/queries";
import { getItemStats } from "@/features/items/queries";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import { getSidebarItemTypes } from "@/features/item-types/queries";
import type { SidebarItemType } from "@/features/item-types/types";

interface TotalCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

function TotalCard({ label, value, icon: Icon }: TotalCardProps) {
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

function TypeCount({ type }: { type: SidebarItemType }) {
  const typeName = useTranslations("itemTypes");
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <TypeIcon
        name={type.icon}
        className="size-4 shrink-0"
        style={{ color: type.color }}
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
      <div className="grid grid-cols-2 gap-4">
        <TotalCard label={t("items")} value={itemStats.total} icon={Package} />
        <TotalCard
          label={t("collections")}
          value={collectionStats.total}
          icon={FolderOpen}
        />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {itemTypes.map((type) => (
          <TypeCount key={type.id} type={type} />
        ))}
      </ul>
    </section>
  );
}
