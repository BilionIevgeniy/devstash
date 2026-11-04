import { notFound } from "next/navigation";
import { Star } from "lucide-react";

import { CollectionSections } from "@/app/(app)/collections/[id]/_components/CollectionSections";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { CollectionHeaderActions } from "@/features/collections/components/CollectionHeaderActions";
import { getCollectionById } from "@/features/collections/queries";
import { collectionIdSchema } from "@/features/collections/schemas";
import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";
import { getUserCollectionListing } from "@/features/items/services/collection-listing";

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[id]">) {
  const parsedId = collectionIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();

  const { id: userId } = await getSessionUser();
  const [collection, { itemCount, sections }] = await Promise.all([
    getCollectionById(userId, parsedId.data),
    getUserCollectionListing(userId, parsedId.data),
  ]);
  if (!collection) notFound();

  const itemLabel = itemCount === 1 ? "item" : "items";

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <span className="min-w-0 wrap-break-word">{collection.name}</span>
            {collection.isFavorite && (
              <Star className="size-6 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
          </h1>
          <p className="text-muted-foreground">
            {itemCount} {itemLabel}
          </p>
          <p className="mt-1 min-h-5 text-sm wrap-break-word text-muted-foreground">
            {collection.description}
          </p>
        </div>
        <CollectionHeaderActions collection={collection} />
      </header>
      {/* Around the empty state too: the last item leaving through the open
          drawer must not unmount the drawer's sheet. */}
      <ItemDrawerProvider>
        <CollectionSections sections={sections} />
      </ItemDrawerProvider>
    </div>
  );
}
