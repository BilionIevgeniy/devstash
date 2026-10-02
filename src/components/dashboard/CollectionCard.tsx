import Link from "next/link";
import { Star } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { getCollectionTypes, type Collection } from "@/lib/dashboard-data";

interface CollectionCardProps {
  collection: Collection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const types = getCollectionTypes(collection.id);
  const accentColor = types[0]?.color;

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="block rounded-lg border border-l-4 bg-card p-4 transition-colors hover:bg-accent"
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="flex items-center gap-2">
        <h3 className="truncate font-medium">{collection.name}</h3>
        {collection.isFavorite && (
          <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {collection.itemCount} items
      </p>
      <p className="mt-3 truncate text-sm text-muted-foreground">
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
    </Link>
  );
}
