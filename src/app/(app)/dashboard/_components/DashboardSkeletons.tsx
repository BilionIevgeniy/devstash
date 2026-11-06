import { Skeleton } from "@/components/ui/skeleton";
import { CollectionGridSkeleton } from "@/features/collections/components/CollectionGridSkeleton";

const STAT_CARDS = 4;
export const PINNED_SKELETON_ROWS = 2;
export const RECENT_SKELETON_ROWS = 5;

// Block heights mirror the rendered cards (StatsCards, ItemRow) so the page
// does not shift when the real content streams in.
const STAT_CARD_HEIGHT = "h-22";
const ITEM_ROW_HEIGHT = "h-26";

function SkeletonBlocks({
  count,
  className,
}: {
  count: number;
  className: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={className} />
      ))}
    </>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <SkeletonBlocks
        count={STAT_CARDS}
        className={`${STAT_CARD_HEIGHT} rounded-lg`}
      />
    </div>
  );
}

export function CollectionsSkeleton() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-14" />
      </div>
      <CollectionGridSkeleton />
    </section>
  );
}

export function ItemsSkeleton({ rows }: { rows: number }) {
  return (
    <section>
      <Skeleton className="mb-4 h-7 w-32" />
      <div className="space-y-3">
        <SkeletonBlocks
          count={rows}
          className={`${ITEM_ROW_HEIGHT} rounded-lg`}
        />
      </div>
    </section>
  );
}
