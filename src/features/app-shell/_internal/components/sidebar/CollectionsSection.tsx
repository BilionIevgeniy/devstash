import Link from "next/link";
import { Star } from "lucide-react";

import { CollapsibleSection } from "@/features/app-shell/_internal/components/CollapsibleSection";
import {
  ItemCount,
  LINK_CLASS,
  SidebarGroup,
} from "@/features/app-shell/_internal/components/sidebar/shared";
import { collectionAccent } from "@/features/collections/domain/collection-accent";
import type {
  DashboardCollection,
  SidebarCollections,
} from "@/features/collections/types";

interface CollectionLinkProps {
  collection: DashboardCollection;
}

function FavoriteLink({ collection }: CollectionLinkProps) {
  return (
    <Link href={`/collections/${collection.id}`} className={LINK_CLASS}>
      <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
      <span className="truncate">{collection.name}</span>
      <ItemCount value={collection.itemCount} />
    </Link>
  );
}

function RecentLink({ collection }: CollectionLinkProps) {
  const color = collectionAccent(collection.types);

  return (
    <Link href={`/collections/${collection.id}`} className={LINK_CLASS}>
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center"
      >
        <span
          className="size-2.5 rounded-full bg-muted-foreground/40"
          style={color ? { backgroundColor: color } : undefined}
        />
      </span>
      <span className="truncate">{collection.name}</span>
      <ItemCount value={collection.itemCount} />
    </Link>
  );
}

export function CollectionsSection({
  favorites,
  recent,
  hasMoreFavorites,
  hasMoreRecent,
}: SidebarCollections) {
  if (favorites.length === 0 && recent.length === 0) return null;

  return (
    <CollapsibleSection title="Collections">
      <div className="space-y-4">
        {favorites.length > 0 && (
          <SidebarGroup
            label="Favorites"
            viewAll={
              hasMoreFavorites
                ? { href: "/favorites", label: "View all favorites" }
                : undefined
            }
          >
            {favorites.map((collection) => (
              <li key={collection.id}>
                <FavoriteLink collection={collection} />
              </li>
            ))}
          </SidebarGroup>
        )}
        {recent.length > 0 && (
          <SidebarGroup
            label="Recent"
            viewAll={
              hasMoreRecent
                ? { href: "/collections", label: "View all collections" }
                : undefined
            }
          >
            {recent.map((collection) => (
              <li key={collection.id}>
                <RecentLink collection={collection} />
              </li>
            ))}
          </SidebarGroup>
        )}
      </div>
    </CollapsibleSection>
  );
}
