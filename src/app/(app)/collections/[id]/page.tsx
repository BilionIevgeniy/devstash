import { notFound } from "next/navigation";
import { Star } from "lucide-react";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { getCollectionById } from "@/features/collections/queries";
import { collectionIdSchema } from "@/features/collections/schemas";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";
import { ItemList } from "@/features/items/components/ItemList";
import { getItemsByCollection } from "@/features/items/queries";

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[id]">) {
  const parsedId = collectionIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();

  const { id: userId } = await getSessionUser();
  const [collection, items] = await Promise.all([
    getCollectionById(userId, parsedId.data),
    getItemsByCollection(userId, parsedId.data),
  ]);
  if (!collection) notFound();

  const itemLabel = items.length === 1 ? "item" : "items";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <span className="min-w-0 wrap-break-word">{collection.name}</span>
          {collection.isFavorite && (
            <Star className="size-6 shrink-0 fill-yellow-400 text-yellow-400" />
          )}
        </h1>
        <p className="text-muted-foreground">
          {items.length} {itemLabel}
        </p>
        <p className="mt-1 min-h-5 text-sm wrap-break-word text-muted-foreground">
          {collection.description}
        </p>
      </header>
      <ItemDrawerProvider>
        <ItemList
          items={items}
          emptyMessage="No items in this collection yet."
        />
      </ItemDrawerProvider>
    </div>
  );
}
