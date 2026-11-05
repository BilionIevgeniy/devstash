import { CollapsibleSection } from "@/features/app-shell/_internal/components/CollapsibleSection";
import {
  SidebarGroup,
  type ViewAllTarget,
} from "@/features/app-shell/_internal/components/sidebar/shared";
import { SidebarItemLink } from "@/features/app-shell/_internal/components/sidebar/SidebarItemLink";
import type { SidebarItem, SidebarItems } from "@/features/items/types";

interface ItemGroupProps {
  label: string;
  items: SidebarItem[];
  viewAll?: ViewAllTarget;
}

function ItemGroup({ label, items, viewAll }: ItemGroupProps) {
  if (items.length === 0) return null;

  return (
    <SidebarGroup label={label} viewAll={viewAll}>
      {items.map((item) => (
        <li key={item.id}>
          <SidebarItemLink item={item} />
        </li>
      ))}
    </SidebarGroup>
  );
}

export function ItemsSection({
  favorites,
  pinned,
  hasMoreFavorites,
  hasMorePinned,
}: SidebarItems) {
  if (favorites.length === 0 && pinned.length === 0) return null;

  return (
    <CollapsibleSection title="Items">
      <div className="space-y-4">
        <ItemGroup
          label="Favorites"
          items={favorites}
          viewAll={
            hasMoreFavorites
              ? { href: "/favorites", label: "View all favorites" }
              : undefined
          }
        />
        <ItemGroup
          label="Pinned"
          items={pinned}
          viewAll={
            hasMorePinned
              ? { href: "/pinned", label: "View all pinned" }
              : undefined
          }
        />
      </div>
    </CollapsibleSection>
  );
}
