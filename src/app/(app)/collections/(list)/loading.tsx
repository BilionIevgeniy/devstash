import { Skeleton } from "@/components/ui/skeleton";
import { CollectionGridSkeleton } from "@/features/collections/components/CollectionGridSkeleton";

// In the (list) group so it is not the loading state of /collections/[id] too:
// a link from outside would otherwise flash this grid before that page's own.
export default function CollectionsLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-1 h-5 w-20" />
      </header>
      <CollectionGridSkeleton />
    </div>
  );
}
