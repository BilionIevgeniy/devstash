import { LIST_ROW_HEIGHT } from "@/app/(app)/_components/ListRow";
import { SORT_SELECT_WIDTH } from "@/app/(app)/_components/SortSelect";
import { PINNED_GROUP_HEADER } from "@/app/(app)/pinned/_components/PinnedGroup";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const GROUP_ROWS = [4, 3, 2];

interface GroupSkeletonProps {
  rows: number;
}

function GroupSkeleton({ rows }: GroupSkeletonProps) {
  return (
    <section className="space-y-2">
      <div className={PINNED_GROUP_HEADER}>
        <Skeleton className="h-6 w-36" />
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
            <Skeleton className="h-4 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </section>
  );
}

// The number of pins is not known yet: a user with fewer rows sees the list end
// early.
export default function PinnedLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-1 h-6 w-56" />
      </header>
      {GROUP_ROWS.map((rows, index) => (
        <GroupSkeleton key={index} rows={rows} />
      ))}
    </div>
  );
}
