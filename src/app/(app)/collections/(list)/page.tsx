import { Suspense } from "react";

import CollectionsLoading from "@/app/(app)/collections/(list)/loading";
import { PaginationNav } from "@/components/common/PaginationNav";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { CollectionCard } from "@/features/collections/components/CollectionCard";
import { getUserCollections } from "@/features/collections/queries";
import { parsePage } from "@/lib/pagination";

async function CollectionsContent({ page }: { page: number }) {
  const { id: userId } = await getSessionUser();
  const {
    items: collections,
    totalCount,
    page: currentPage,
    totalPages,
  } = await getUserCollections(userId, page);
  const collectionLabel = totalCount === 1 ? "collection" : "collections";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="text-muted-foreground">
          {totalCount} {collectionLabel}
        </p>
      </header>
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collections yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
      <PaginationNav
        basePath="/collections"
        page={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}

// loading.tsx does not show when only the query string changes, since the
// segment stays the same: the key gives each page its own loading state.
export default async function CollectionsPage({
  searchParams,
}: PageProps<"/collections">) {
  const page = parsePage((await searchParams).page);

  return (
    <Suspense key={page} fallback={<CollectionsLoading />}>
      <CollectionsContent page={page} />
    </Suspense>
  );
}
