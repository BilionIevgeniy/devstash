import { CollapsibleSection } from "@/features/app-shell/_internal/components/CollapsibleSection";
import { useTranslations } from "next-intl";
import {
  SidebarGroup,
  type ViewAllTarget,
} from "@/features/app-shell/_internal/components/sidebar/shared";
import { SidebarItemLink } from "@/features/app-shell/_internal/components/sidebar/SidebarItemLink";
import { canUseType } from "@/features/items/domain/item-fields";
import type { SidebarItem, SidebarItems } from "@/features/items/types";

interface ItemGroupProps {
  label: string;
  items: SidebarItem[];
  isPro: boolean;
  viewAll?: ViewAllTarget;
}

function ItemGroup({ label, items, isPro, viewAll }: ItemGroupProps) {
  if (items.length === 0) return null;

  return (
    <SidebarGroup label={label} viewAll={viewAll}>
      {items.map((item) => (
        <li key={item.id}>
          <SidebarItemLink
            item={item}
            isLocked={!canUseType(item.type.name, isPro)}
          />
        </li>
      ))}
    </SidebarGroup>
  );
}

interface ItemsSectionProps extends SidebarItems {
  isPro: boolean;
}

export function ItemsSection({
  favorites,
  pinned,
  hasMoreFavorites,
  hasMorePinned,
  isPro,
}: ItemsSectionProps) {
  const t = useTranslations("shell");
  if (favorites.length === 0 && pinned.length === 0) return null;

  return (
    <CollapsibleSection title={t("items")}>
      <div className="space-y-4">
        <ItemGroup
          label={t("favorites")}
          items={favorites}
          isPro={isPro}
          viewAll={
            hasMoreFavorites
              ? { href: "/favorites", label: t("viewAllFavorites") }
              : undefined
          }
        />
        <ItemGroup
          label={t("pinned")}
          items={pinned}
          isPro={isPro}
          viewAll={
            hasMorePinned
              ? { href: "/pinned", label: t("viewAllPinned") }
              : undefined
          }
        />
      </div>
    </CollapsibleSection>
  );
}
