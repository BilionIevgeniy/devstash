import Link from "next/link";

import { CollectionCard } from "@/features/collections/components/CollectionCard";
import { getRecentCollections } from "@/features/collections/queries";
import { getSessionUser } from "@/features/auth/services/session";

export async function RecentCollections() {
  const { id: userId } = await getSessionUser();
  const collections = await getRecentCollections(userId);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collections</h2>
        <Link
          href="/collections"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </div>
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collections yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </section>
  );
}
