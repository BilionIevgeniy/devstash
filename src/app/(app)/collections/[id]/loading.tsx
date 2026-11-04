import { Skeleton } from "@/components/ui/skeleton";
import { ItemListSkeleton } from "@/features/items/components/ItemListSkeleton";

export default function CollectionLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-1 h-5 w-20" />
        <Skeleton className="mt-1 h-5 w-64 max-w-full" />
      </header>
      <ItemListSkeleton />
    </div>
  );
}
