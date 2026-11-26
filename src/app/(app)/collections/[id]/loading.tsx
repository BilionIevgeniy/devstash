import { Skeleton } from "@/components/ui/skeleton";
import { ItemListSkeleton } from "@/features/items/components/lists/ItemListSkeleton";

export default function CollectionLoading() {
  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-1 h-5 w-20" />
          <Skeleton className="mt-1 h-5 w-64 max-w-full" />
        </div>
        <Skeleton className="h-8 w-26 shrink-0 max-md:h-11 max-md:w-35" />
      </header>
      {/* The section of one type, the common case: its title and its cards. */}
      <section className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <ItemListSkeleton />
      </section>
    </div>
  );
}
