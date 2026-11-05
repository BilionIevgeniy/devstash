import Link from "next/link";

import { CollectionCardActions } from "@/features/collections/_internal/components/CollectionCardActions";
import { collectionAccent } from "@/features/collections/domain/collection-accent";
import { TypeIcon } from "@/features/item-types/components/TypeIcon";
import type { DashboardCollection } from "@/features/collections/types";

interface CollectionCardProps {
  collection: DashboardCollection;
}

// The link stretches over the whole card through its ::after, and the actions
// sit above it: a button may not be inside a link, and a click on it must not
// navigate.
export function CollectionCard({ collection }: CollectionCardProps) {
  const { types } = collection;
  const accentColor = collectionAccent(types);
  const itemLabel = collection.itemCount === 1 ? "item" : "items";

  return (
    <div
      className="relative rounded-lg border border-l-4 bg-card p-4 transition-colors hover:bg-accent"
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="pr-16">
        <h3 className="truncate font-medium">
          <Link
            href={`/collections/${collection.id}`}
            className="outline-none after:absolute after:-inset-px after:-left-1 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {collection.name}
          </Link>
        </h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {collection.itemCount} {itemLabel}
      </p>
      <p className="mt-3 min-h-5 truncate text-sm text-muted-foreground">
        {collection.description}
      </p>
      <div className="mt-3 flex h-4 items-center gap-2">
        {types.map((type) => (
          <TypeIcon
            key={type.id}
            name={type.icon}
            className="size-4"
            style={{ color: type.color }}
            aria-label={type.name}
          />
        ))}
      </div>
      <CollectionCardActions collection={collection} />
    </div>
  );
}
