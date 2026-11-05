import Link from "next/link";

import { CollapsibleSection } from "@/features/app-shell/_internal/components/CollapsibleSection";
import {
  GroupLabel,
  LINK_CLASS,
} from "@/features/app-shell/_internal/components/sidebar/shared";
import { SidebarItemLink } from "@/features/app-shell/_internal/components/sidebar/SidebarItemLink";
import type { SidebarItem, SidebarItems } from "@/features/items/types";
import { cn } from "@/lib/utils";

interface ItemGroupProps {
  label: string;
  items: SidebarItem[];
}

function ItemGroup({ label, items }: ItemGroupProps) {
  if (items.length === 0) return null;

  return (
    <>
      <GroupLabel>{label}</GroupLabel>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <SidebarItemLink item={item} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function ItemsSection({
  favorites,
  pinned,
  hasMoreFavorites,
}: SidebarItems) {
  if (favorites.length === 0 && pinned.length === 0) return null;

  return (
    <CollapsibleSection title="Items">
      <ItemGroup label="Favorites" items={favorites} />
      {hasMoreFavorites && (
        <Link
          href="/favorites"
          className={cn(LINK_CLASS, "mt-1 text-muted-foreground")}
        >
          View all favorites
        </Link>
      )}
      <ItemGroup label="Pinned" items={pinned} />
    </CollapsibleSection>
  );
}
