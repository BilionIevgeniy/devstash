import { LIST_ROW_HEIGHT } from "@/app/(app)/_components/ListRow";
import { SORT_SELECT_WIDTH } from "@/app/(app)/_components/SortSelect";
import { FAVORITE_SECTION_HEADER } from "@/app/(app)/favorites/_components/FavoriteSection";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ITEM_ROWS = 6;
const COLLECTION_ROWS = 3;

interface SectionSkeletonProps {
  rows: number;
}

function SectionSkeleton({ rows }: SectionSkeletonProps) {
  return (
    <section className="space-y-2">
      <div className={FAVORITE_SECTION_HEADER}>
        <Skeleton className="h-5 w-28" />
        <Skeleton className={cn(SORT_SELECT_WIDTH, "h-8")} />
      </div>
      <div>
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className={cn("flex items-center gap-3 px-2", LIST_ROW_HEIGHT)}
          >
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16 shrink-0 rounded-4xl" />
            <Skeleton className="h-4 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </section>
  );
}

// The number of favorites is not known yet: a user with fewer rows sees the
// list end early.
export default function FavoritesLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-1 h-6 w-64" />
      </header>
      <SectionSkeleton rows={ITEM_ROWS} />
      <SectionSkeleton rows={COLLECTION_ROWS} />
    </div>
  );
}
