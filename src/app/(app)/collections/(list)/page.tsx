import { getSessionUser } from "@/features/auth/nextauth/session";
import { CollectionCard } from "@/features/collections/components/CollectionCard";
import { getUserCollections } from "@/features/collections/queries";

export default async function CollectionsPage() {
  const { id: userId } = await getSessionUser();
  const collections = await getUserCollections(userId);
  const collectionLabel =
    collections.length === 1 ? "collection" : "collections";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="text-muted-foreground">
          {collections.length} {collectionLabel}
        </p>
      </header>
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collections yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
