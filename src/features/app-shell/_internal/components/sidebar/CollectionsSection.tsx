import Link from "next/link";
import { Star } from "lucide-react";

import { CollapsibleSection } from "@/features/app-shell/_internal/components/CollapsibleSection";
import { ItemCount, LINK_CLASS } from "@/features/app-shell/_internal/components/sidebar/shared";
import { cn } from "@/lib/utils";
import type {
  DashboardCollection,
  SidebarCollections,
} from "@/features/collections/types";

interface CollectionLinkProps {
  collection: DashboardCollection;
}

function GroupLabel({ children }: { children: string }) {
  return (
    <h3 className="px-2 pb-1 pt-2 text-xs font-medium uppercase text-muted-foreground">
      {children}
    </h3>
  );
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
  const color = collection.types[0]?.color;

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

export function CollectionsSection({ favorites, recent }: SidebarCollections) {
  return (
    <CollapsibleSection title="Collections">
      {favorites.length > 0 && (
        <>
          <GroupLabel>Favorites</GroupLabel>
          <ul>
            {favorites.map((collection) => (
              <li key={collection.id}>
                <FavoriteLink collection={collection} />
              </li>
            ))}
          </ul>
        </>
      )}
      {recent.length > 0 && (
        <>
          <GroupLabel>Recent</GroupLabel>
          <ul>
            {recent.map((collection) => (
              <li key={collection.id}>
                <RecentLink collection={collection} />
              </li>
            ))}
          </ul>
        </>
      )}
      <Link
        href="/collections"
        className={cn(LINK_CLASS, "mt-1 text-muted-foreground")}
      >
        View all collections
      </Link>
    </CollapsibleSection>
  );
}
